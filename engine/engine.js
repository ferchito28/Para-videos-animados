// Motor de render: arma cada escena (set + personajes + props + cámara) y
// dibuja el frame del tiempo t de forma determinista (window.renderFrame(t)).
import * as THREE from 'three';
import { createSet } from './sets.js';
import { createCharacter } from './characters.js';
import { createProp } from './props.js';
import { clamp, lerp, easeInOut, easeOut, easeOutBack, hash } from './util.js';

let renderer, data, scenes = [], chunks = [];

export async function setup(d) {
  data = d;
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(d.width, d.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('stage').prepend(renderer.domElement);
  await document.fonts.ready;
  scenes = d.scenes.map(buildScene);
  chunks = buildChunks(d.words, d.subtitulos || {});
  // precompila shaders de todas las escenas para que el primer frame de cada una no tarde
  for (const s of scenes) renderer.compile(s.scene, s.camera);
}

// ---------- Construcción de escena ----------
function buildScene(sd) {
  const scene = new THREE.Scene();
  const set = createSet(sd.set, sd.setOpts || {});
  scene.add(set.group);
  scene.background = new THREE.Color(set.bg || '#87ceeb');
  if (set.fog) scene.fog = new THREE.Fog(...set.fog);
  const parent = set.rocking || scene; // en el barco, personajes y props se mecen con la cubierta

  const chars = (sd.personajes || []).map((pc) => {
    const ch = createCharacter(pc);
    ch.cfg = pc;
    ch.path = buildPath(pc, sd);
    parent.add(ch.group);
    return ch;
  });
  const props = (sd.props || []).map((pp) => {
    const p = createProp(pp);
    p.userData.cfg = pp;
    parent.add(p);
    return p;
  });
  const camera = new THREE.PerspectiveCamera(40, data.width / data.height, 0.1, 300);
  return { sd, scene, set, chars, props, camera };
}

// Recorrido del personaje: posición y acción en cada instante de la escena.
function buildPath(pc, sd) {
  const acts = (pc.acciones && pc.acciones.length ? pc.acciones : [{ accion: pc.accion || 'quieto', start: sd.start, a: pc.a, duracion: pc.duracion, cara: pc.cara }])
    .map((a) => ({ ...a, start: a.start ?? sd.start }))
    .sort((x, y) => x.start - y.start);
  let pos = [...(pc.pos || [0, 0])];
  let dir = pc.mira === 'izquierda' ? -1 : 1;
  const segs = acts.map((a, i) => {
    const end = i + 1 < acts.length ? acts[i + 1].start : sd.end;
    const from = [...pos];
    const to = a.a ? [...a.a] : [...pos];
    if (a.a && to[0] !== from[0]) dir = Math.sign(to[0] - from[0]);
    if (a.mira) dir = a.mira === 'izquierda' ? -1 : 1;
    const moveDur = a.duracion || Math.max(0.3, end - a.start);
    pos = to;
    return { ...a, end, from, to, dir, moveDur };
  });
  return segs;
}

function charState(ch, t) {
  const segs = ch.path;
  let seg = segs[0];
  for (const s of segs) if (t >= s.start) seg = s;
  const k = clamp((t - seg.start) / seg.moveDur);
  const moving = (seg.accion === 'caminar' || seg.accion === 'correr') && k < 1 && (seg.to[0] !== seg.from[0] || seg.to[1] !== seg.from[1]);
  const x = lerp(seg.from[0], seg.to[0], k), z = lerp(seg.from[1], seg.to[1], k);
  return { seg, x, z, accion: moving || !['caminar', 'correr'].includes(seg.accion) ? seg.accion : 'quieto', t: t - seg.start, dir: seg.dir };
}

// ---------- Cámara ----------
function focusPoint(sc, t) {
  const cam = sc.sd.camara || {};
  if (Array.isArray(cam.objetivo)) return new THREE.Vector3(...cam.objetivo);
  const list = cam.objetivo ? sc.chars.filter((c) => c.cfg.id === cam.objetivo) : sc.chars;
  if (!list.length) return new THREE.Vector3(0, 1.3, 0);
  const v = new THREE.Vector3();
  for (const c of list) { const s = charState(c, t); v.add(new THREE.Vector3(s.x, (c.cfg.escala || 1) * (c.focusY || 1.25), s.z)); }
  return v.divideScalar(list.length);
}

function updateCamera(sc, t) {
  const { sd, camera } = sc;
  const cam = sd.camara || {};
  const tipo = cam.tipo || 'frente';
  const p = clamp((t - sd.start) / Math.max(0.01, sd.end - sd.start));
  const e = easeInOut(p);
  const target = focusPoint(sc, t);
  let dist = cam.distancia || 7.5, h = cam.altura ?? 0.9, ang = cam.angulo || 0, dx = 0;
  switch (tipo) {
    case 'acercar': dist *= lerp(1.3, 0.78, e); break;
    case 'alejar': dist *= lerp(0.75, 1.3, e); break;
    case 'paneo': dx = lerp(cam.de ?? -1.4, cam.a ?? 1.4, e); break;
    case 'orbita': ang += lerp(-0.4, 0.4, e); break;
    case 'arriba': h = 4.5; dist *= lerp(1.1, 0.9, e); break;
    case 'abajo': h = -0.7; dist *= 0.85; break;
    case 'detalle': dist = cam.distancia || 3.6; dist *= lerp(1.08, 0.92, e); h = cam.altura ?? 0.3; break;
    case 'plano': dist *= lerp(1.9, 1.7, e); h = 2.2; break;
    case 'seguir': dist *= 0.95; break;
  }
  // golpe de zoom al empezar cada escena (dinamismo de cortes rápidos)
  const punch = 1 - 0.07 * (1 - easeOut(clamp((t - sd.start) / 0.35)));
  if (sd.index > 0 && (sd.transicion || 'zoom') === 'zoom') dist *= punch;
  // pequeño movimiento de cámara en mano
  const sdn = hash(sd.index) * 10;
  const hx = Math.sin(t * 0.9 + sdn) * 0.05, hy = Math.sin(t * 1.3 + sdn) * 0.04;
  camera.position.set(target.x + dx + Math.sin(ang) * dist + hx, target.y + h + hy, target.z + Math.cos(ang) * dist);
  const look = target.clone(); look.x += dx * 0.85; look.y += 0.1;
  if (cam.sacudir) { const k = typeof cam.sacudir === 'number' ? cam.sacudir : 1; camera.position.x += Math.sin(t * 47) * 0.06 * k; camera.position.y += Math.sin(t * 61) * 0.05 * k; }
  camera.lookAt(look);
  if (cam.inclinar) camera.rotateZ((cam.inclinar * Math.PI) / 180);
  camera.fov = cam.fov || 40;
  camera.updateProjectionMatrix();
}

// ---------- Subtítulos ----------
function buildChunks(words, opts) {
  const max = opts.palabras || 3, maxChars = opts.caracteres || 16;
  const out = []; let cur = [];
  const flush = () => { if (cur.length) out.push(cur); cur = []; };
  words.forEach((w, i) => {
    cur.push({ ...w, i });
    const len = cur.map((x) => x.w).join(' ').length;
    const punct = /[.,;:!?…]$/.test(w.w);
    const nextGap = words[i + 1] ? words[i + 1].start - w.end : 1;
    if (cur.length >= max || len >= maxChars || punct || nextGap > 0.35) flush();
  });
  flush();
  return out.map((c, k) => ({ words: c, start: c[0].start, end: out[k + 1] ? Math.min(out[k + 1][0].start, c[c.length - 1].end + 0.6) : c[c.length - 1].end + 0.6 }));
}

const capEl = () => document.getElementById('cap');
let lastChunk = -1;
function updateCaptions(t) {
  const el = capEl();
  const idx = chunks.findIndex((c) => t >= c.start && t < c.end);
  if (idx < 0) { el.style.opacity = 0; lastChunk = -1; return; }
  const c = chunks[idx];
  if (idx !== lastChunk) {
    el.innerHTML = c.words.map((w) => `<span>${escapeHtml(w.w)}</span>`).join(' ');
    lastChunk = idx;
  }
  const spans = el.querySelectorAll('span');
  c.words.forEach((w, k) => spans[k].classList.toggle('on', t >= w.start && t < (c.words[k + 1]?.start ?? c.end)));
  const k = clamp((t - c.start) / 0.14);
  el.style.opacity = 1;
  el.style.transform = `translateX(-50%) scale(${lerp(0.75, 1, easeOutBack(k))})`;
}
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Rótulo grande (fechas, lugares, cifras)
function updateTitle(sc, t) {
  const el = document.getElementById('title');
  const r = sc?.sd.rotulo;
  if (!r || t < r.start || t > r.end) { el.style.opacity = 0; return; }
  if (el.dataset.key !== r.texto + sc.sd.index) {
    el.dataset.key = r.texto + sc.sd.index;
    el.innerHTML = `<div class="t1">${escapeHtml(r.texto)}</div>${r.subtitulo ? `<div class="t2">${escapeHtml(r.subtitulo)}</div>` : ''}`;
    // ajusta el tamaño para que el rótulo quepa en el 90% del ancho
    for (const [cls, max] of [['.t1', 0.09], ['.t2', 0.036]]) {
      const n = el.querySelector(cls); if (!n) continue;
      let fs = max * innerHeight; n.style.fontSize = fs + 'px';
      while (n.scrollWidth > innerWidth * 0.9 && fs > 10) { fs *= 0.92; n.style.fontSize = fs + 'px'; }
    }
  }
  const kin = easeOutBack(clamp((t - r.start) / 0.3));
  const kout = clamp((r.end - t) / 0.2);
  el.style.opacity = Math.min(1, kout * 1.5);
  el.style.transform = `translateX(-50%) scale(${kin}) rotate(${(1 - kin) * -6}deg)`;
}

function updateFlash(sc, t) {
  const el = document.getElementById('flash');
  if (!sc || sc.sd.index === 0 || sc.sd.transicion !== 'flash') { el.style.opacity = 0; return; }
  el.style.opacity = 1 - clamp((t - sc.sd.start) / 0.2);
}

// ---------- Frame ----------
const speakingAt = (t) => data.words.some((w) => t >= w.start - 0.02 && t < w.end - 0.03);

export function renderFrame(t) {
  let sc = scenes[0];
  for (const s of scenes) if (t >= s.sd.start) sc = s;
  const hablando = speakingAt(t);
  sc.set.update(t, clamp((t - sc.sd.start) / Math.max(0.01, sc.sd.end - sc.sd.start)));
  for (const ch of sc.chars) {
    const st = charState(ch, t);
    ch.group.position.set(st.x, 0, st.z);
    ch.group.scale.x = Math.abs(ch.group.scale.x) * st.dir;
    ch.update({ accion: st.accion, t: st.t, tg: t, cara: st.seg.cara || ch.cfg.cara, habla: ch.cfg.habla, hablando });
  }
  for (const p of sc.props) {
    const cfg = p.userData.cfg, base = p.userData.base;
    p.userData.update?.(t);
    const lt = t - sc.sd.start;
    if (cfg.anim === 'flotar') p.position.y = base.y + 0.5 + Math.sin(t * 2) * 0.12;
    if (cfg.anim === 'girar') p.rotation.y = t * 1.2;
    if (cfg.anim === 'temblar') p.position.x = cfg.pos[0] + Math.sin(t * 40) * 0.03;
    if (cfg.anim === 'aparecer') p.scale.setScalar(base.s * easeOutBack(clamp((lt - (cfg.retraso || 0)) / 0.4)));
    if (cfg.anim === 'caer') { const k = clamp((lt - (cfg.retraso || 0)) / 0.6); p.position.y = base.y + (1 - k * k) * 5; }
  }
  updateCamera(sc, t);
  renderer.render(sc.scene, sc.camera);
  updateCaptions(t);
  updateTitle(sc, t);
  updateFlash(sc, t);
}
