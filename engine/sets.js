// Escenarios 3D (sets). Cada set devuelve { group, update(t), cam } con el piso en y=0.
// Zona de actuación: x entre -3 y 3, z entre -1 y 2. La cámara mira desde +z.
import * as THREE from 'three';
import { canvasTexture, toon, box, cyl, sphere, mesh, rng, shade, roundRect } from './util.js';

// ---------- Texturas procedurales ----------
const tex = {
  ladrillo: (base = '#9b4a32', mortar = '#d8c4a8', rep = [6, 4]) => canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = mortar; g.fillRect(0, 0, W, H);
    const r = rng('ladrillo' + base); const bh = 64, bw = 128;
    for (let y = 0; y < H; y += bh) for (let x = -(y / bh % 2) * bw / 2; x < W; x += bw) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.25); g.fillRect(x + 4, y + 4, bw - 8, bh - 8);
    }
  }, { repeat: rep }),
  piedra: (base = '#8d8d8d', rep = [4, 3]) => canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = shade(base, -0.35); g.fillRect(0, 0, W, H);
    const r = rng('piedra' + base);
    for (let y = 0; y < H; y += 96) for (let x = (y / 96 % 2) * 60; x < W + 100; x += 128) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.3); roundRect(g, x + 5, y + 5, 118, 86, 18); g.fill();
    }
  }, { repeat: rep }),
  tablas: (base = '#a0693a', rep = [1, 6], vertical = false) => canvasTexture(512, 512, (g, W, H) => {
    const r = rng('tablas' + base);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.25);
      if (vertical) g.fillRect(i * 64, 0, 64, H); else g.fillRect(0, i * 64, W, 64);
      g.fillStyle = shade(base, -0.4);
      if (vertical) g.fillRect(i * 64, 0, 4, H); else g.fillRect(0, i * 64, W, 4);
      g.fillStyle = shade(base, -0.2);
      for (let k = 0; k < 6; k++) { const p = r() * 512; if (vertical) g.fillRect(i * 64 + 10 + r() * 40, p, 2, 30); else g.fillRect(p, i * 64 + 10 + r() * 40, 30, 2); }
    }
  }, { repeat: rep }),
  baldosa: (a = '#e8e2d4', b = '#cfc6b2', rep = [6, 6]) => canvasTexture(256, 256, (g, W, H) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 128, y * 128, 128, 128); }
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128);
  }, { repeat: rep }),
  ruido: (base, amount = 0.12, rep = [4, 4], dots = 1800) => canvasTexture(256, 256, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H); const r = rng('ruido' + base);
    for (let i = 0; i < dots; i++) { g.fillStyle = shade(base, (r() - 0.5) * amount * 2); g.fillRect(r() * W, r() * H, 3 + r() * 4, 3 + r() * 4); }
  }, { repeat: rep }),
  ventanas: (wall, win = '#9fd3f5', lit = false) => canvasTexture(256, 512, (g, W, H) => {
    g.fillStyle = wall; g.fillRect(0, 0, W, H); const r = rng(wall);
    for (let y = 30; y < H - 60; y += 90) for (let x = 30; x < W - 40; x += 75) {
      g.fillStyle = lit && r() > 0.4 ? '#ffd98a' : win; g.fillRect(x, y, 45, 60);
      g.strokeStyle = shade(wall, -0.4); g.lineWidth = 5; g.strokeRect(x, y, 45, 60);
    }
  }),
};
const texMat = (map, color = '#ffffff') => toon(color, { map });

function plane(w, h, mat, o = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), mat, { cast: false, ...o });
}
function floor(mat, w = 40, d = 40) { return plane(w, d, mat, { rx: -Math.PI / 2 }); }
function backWall(mat, { z = -3, w = 24, h = 9 } = {}) { return plane(w, h, mat, { y: h / 2, z }); }
function sideWalls(mat, { x = 5, z = -3, d = 14, h = 9 } = {}) {
  return [plane(d, h, mat, { x: -x, y: h / 2, z: z + d / 2, ry: Math.PI / 2 }), plane(d, h, mat, { x, y: h / 2, z: z + d / 2, ry: -Math.PI / 2 })];
}
function sky(top, bottom) {
  const t = canvasTexture(16, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  return new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false }));
}

function lights(group, { key = '#fff4e0', keyI = 2.4, keyPos = [5, 10, 8], hemiTop = '#ffffff', hemiBottom = '#8a6a4a', hemiI = 1.1, shadowArea = 12 } = {}) {
  group.add(new THREE.HemisphereLight(hemiTop, hemiBottom, hemiI));
  const d = new THREE.DirectionalLight(key, keyI);
  d.position.set(...keyPos); d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  Object.assign(d.shadow.camera, { left: -shadowArea, right: shadowArea, top: shadowArea, bottom: -shadowArea, near: 0.5, far: 60 });
  d.shadow.bias = -0.0005; d.shadow.normalBias = 0.02;
  group.add(d, d.target);
  return d;
}

function lamp(x, y, z, color = '#ffd27a', intensity = 20, dist = 12) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); return l;
}

// ---------- Objetos de decoración reutilizables ----------
function tree(x, z, s = 1, col = '#3f8f3a') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  g.add(cyl(0.18, 0.25, 1.4, '#7a4a24'));
  g.add(mesh(new THREE.ConeGeometry(1.1, 1.8, 10), toon(col), { y: 2.0 }));
  g.add(mesh(new THREE.ConeGeometry(0.85, 1.5, 10), toon(shade(col, 0.1)), { y: 2.8 }));
  return g;
}
function bars(w, h, n, color = '#4a4a4a') {
  const g = new THREE.Group();
  for (let i = 0; i <= n; i++) g.add(cyl(0.05, 0.05, h, color, { x: -w / 2 + (w * i) / n }, 10));
  g.add(box(w + 0.1, 0.1, 0.1, color, { y: h - 0.2 })); g.add(box(w + 0.1, 0.1, 0.1, color, { y: 0.2 }));
  return g;
}
function windowFrame(w, h, color = '#bfe3ff', frame = '#6b4a2b') {
  const g = new THREE.Group();
  g.add(plane(w, h, new THREE.MeshBasicMaterial({ color })));
  for (const [x, y, ww, hh] of [[0, h / 2, w + 0.2, 0.12], [0, -h / 2, w + 0.2, 0.12], [-w / 2, 0, 0.12, h], [w / 2, 0, 0.12, h], [0, 0, 0.08, h], [0, 0, w, 0.08]])
    g.add(mesh(new THREE.BoxGeometry(ww, hh, 0.08), toon(frame), { x, y, z: 0.03 }));
  return g;
}

// ---------- Sets ----------
const SETS = {
  estudio({ color = '#f4c38a' } = {}) {
    const g = new THREE.Group();
    const m = toon(color);
    g.add(floor(m));
    // fondo curvo tipo estudio fotográfico
    const curve = new THREE.CylinderGeometry(4, 4, 30, 32, 1, true, Math.PI, Math.PI / 2);
    const cm = mesh(curve, toon(color, { side: THREE.DoubleSide }), { x: 0, y: 4, z: 1, rz: Math.PI / 2, cast: false });
    g.add(cm);
    g.add(plane(30, 20, m, { y: 14, z: -3 }));
    lights(g, { hemiBottom: shade(color, -0.4) });
    return { group: g, bg: color };
  },

  carcel({ noche = false } = {}) {
    const g = new THREE.Group();
    g.add(floor(texMat(tex.piedra('#8a8580', [10, 10]))));
    const wall = texMat(tex.ladrillo('#7d7468', '#5c544b', [6, 3]));
    g.add(backWall(wall)); g.add(...sideWalls(wall, { x: 4.5 }));
    // ventana con barrotes y rayo de luz
    const win = windowFrame(1.2, 0.9, noche ? '#1b2a4a' : '#cfe9ff', '#555'); win.position.set(1.6, 3.6, -2.95); g.add(win);
    const wb = bars(1.2, 0.9, 5, '#333'); wb.position.set(1.6, 3.15, -2.9); g.add(wb);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 5, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(1.2, 1.9, -1.5); beam.rotation.x = 0.55; g.add(beam);
    // cama, inodoro, barrotes laterales
    const bed = new THREE.Group(); bed.position.set(-2.6, 0, -1.6);
    bed.add(box(2.2, 0.5, 1, '#6b6b6b')); bed.add(box(2.1, 0.18, 0.95, '#d8d2c0', { y: 0.5 })); bed.add(box(0.5, 0.15, 0.7, '#f2efe6', { x: -0.75, y: 0.68 }));
    g.add(bed);
    const wc = new THREE.Group(); wc.position.set(3.2, 0, -2.3); wc.add(cyl(0.3, 0.22, 0.5, '#e8e8e8')); wc.add(box(0.6, 0.6, 0.25, '#e8e8e8', { z: -0.3, y: 0.3 })); g.add(wc);
    const fb = bars(3, 3.2, 10, '#3a3a3a'); fb.position.set(-4.4, 0, 0.5); fb.rotation.y = Math.PI / 2; g.add(fb);
    lights(g, { key: noche ? '#9db4ff' : '#fff1d0', keyI: noche ? 1.2 : 2.2, keyPos: [3, 9, 4], hemiTop: noche ? '#6d7fa8' : '#e9e4d8', hemiBottom: '#3c3833', hemiI: noche ? 0.6 : 1.0 });
    g.add(lamp(0, 4.5, 0, '#ffe2a8', noche ? 14 : 6, 9));
    return { group: g, bg: '#3c3833' };
  },

  tunel() {
    const g = new THREE.Group();
    const dirt = texMat(tex.ruido('#6b4a2e', 0.2, [6, 6]));
    g.add(floor(dirt));
    const tube = mesh(new THREE.CylinderGeometry(3.2, 3.2, 30, 24, 1, true), toon('#ffffff', { map: tex.ruido('#5a3d25', 0.25, [8, 4]), side: THREE.BackSide }), { y: 1.6, rz: Math.PI / 2, cast: false });
    g.add(tube);
    const r = rng('tunel');
    for (let i = 0; i < 8; i++) {
      const x = -8 + i * 2.3;
      const beam = new THREE.Group(); beam.position.set(x, 0, -0.6);
      beam.add(box(0.2, 3.2, 0.2, '#7a5230', { x: 0, z: -1.6 })); beam.add(box(0.2, 0.2, 3.6, '#7a5230', { y: 3.1 }));
      g.add(beam);
      g.add(sphere(0.2 + r() * 0.25, '#4d3520', { x: x + 1, z: -1.4 + r() * 0.3, y: 0 }));
    }
    lights(g, { key: '#ffcf8a', keyI: 0.6, keyPos: [2, 8, 6], hemiTop: '#6b5a48', hemiBottom: '#201810', hemiI: 0.5 });
    g.add(lamp(-1, 2.6, 0.5, '#ffb35c', 30, 10), lamp(3, 2.6, 0.5, '#ffb35c', 20, 9));
    return { group: g, bg: '#1a120b', fog: ['#1a120b', 6, 18] };
  },

  calle({ noche = false, color = '#e3d5b8' } = {}) {
    const g = new THREE.Group();
    g.add(sky(noche ? '#0b1533' : '#7ec8f2', noche ? '#2a3b6b' : '#d9f0ff'));
    g.add(floor(toon('#5b5b5f'), 60, 60));
    g.add(box(40, 0.18, 3.2, '#bdb6a8', { z: -2.3 })); // acera
    const r = rng('calle');
    const cols = ['#e3d5b8', '#c96f4a', '#9bb7d4', '#d9b26f', '#b5c99a', '#e8a598', color];
    for (let i = -5; i <= 5; i++) {
      const h = 5 + r() * 5, w = 3.2;
      const c = cols[Math.floor(r() * cols.length)];
      const b = mesh(new THREE.BoxGeometry(w, h, 3), [toon(shade(c, -0.15)), toon(shade(c, -0.15)), toon(shade(c, -0.25)), toon(c), toon('#ffffff', { map: tex.ventanas(c, noche ? '#24304f' : '#9fd3f5', noche) }), toon(c)], { x: i * 3.3, y: h / 2, z: -5.5 });
      g.add(b);
      if (i % 2 === 0) { const door = box(0.9, 1.6, 0.1, '#5a3a22', { x: i * 3.3, z: -3.95 }); g.add(door); }
    }
    for (let i = -3; i <= 3; i += 2) {
      const p = new THREE.Group(); p.position.set(i * 2.2, 0, -1.2);
      p.add(cyl(0.06, 0.08, 3.4, '#2b2b2b')); p.add(sphere(0.2, toon('#fff2c0', { emissive: '#ffcc66', emissiveIntensity: noche ? 1.5 : 0.2 }), { y: 3.3 }));
      g.add(p);
      if (noche) g.add(lamp(i * 2.2, 3.2, -1, '#ffcc77', 12, 7));
    }
    // líneas de la calle
    for (let x = -20; x < 20; x += 2.5) g.add(box(1.2, 0.01, 0.12, '#f2f2f2', { x, z: 2.5, cast: false }));
    lights(g, { key: noche ? '#8fa8ff' : '#fff4e0', keyI: noche ? 0.7 : 2.6, hemiTop: noche ? '#3b4f8a' : '#cfe8ff', hemiBottom: '#6b6152', hemiI: noche ? 0.5 : 1.1, shadowArea: 16 });
    return { group: g, bg: noche ? '#0b1533' : '#9fd8f7' };
  },

  banco() {
    const g = new THREE.Group();
    g.add(floor(texMat(tex.baldosa('#efe9dc', '#c9bfa8', [10, 10]))));
    const wall = toon('#e9e1cf');
    g.add(backWall(wall)); g.add(...sideWalls(wall, { x: 6 }));
    for (const x of [-4.5, -1.5, 4.5]) { g.add(cyl(0.35, 0.35, 6, '#f4efe2', { x, z: -2.5 })); g.add(box(1, 0.3, 1, '#d8cfb8', { x, z: -2.5, y: 0 })); }
    // bóveda
    const vault = new THREE.Group(); vault.position.set(1.6, 2.2, -2.85);
    vault.add(mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.4, 40), toon('#9aa3ab'), { rx: Math.PI / 2 }));
    vault.add(mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 40), toon('#6b737a'), { z: 0.22 }));
    const wheel = new THREE.Group(); wheel.position.z = 0.3;
    for (let i = 0; i < 3; i++) wheel.add(mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), toon('#c9a227'), { rz: (i * Math.PI) / 3 }));
    wheel.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 20), toon('#c9a227'), { rx: Math.PI / 2 }));
    vault.add(wheel); g.add(vault);
    // mostrador y lingotes
    g.add(box(4, 1.1, 0.8, '#7a4a2a', { x: -3.2, z: -1.2 })); g.add(box(4.1, 0.08, 0.9, '#3c2414', { x: -3.2, z: -1.2, y: 1.1 }));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(0.5, 0.18, 0.25), toon('#f2c230', { emissive: '#7a5a00', emissiveIntensity: 0.3 }), { x: 3.4 + (i % 3) * 0.52, y: 0.09 + Math.floor(i / 3) * 0.18, z: -1.6 }));
    lights(g, { key: '#fff8e8', keyI: 2.2, hemiTop: '#fffaf0', hemiBottom: '#b8a98a' });
    return { group: g, bg: '#e9e1cf', update: (t) => { wheel.rotation.z = t * 0.2; } };
  },

  barco({ noche = false, tormenta = false, hundir = false } = {}) {
    const g = new THREE.Group();
    g.add(sky(tormenta ? '#3d4a5c' : noche ? '#0b1533' : '#6ec3f4', tormenta ? '#7d8a99' : noche ? '#33467a' : '#d8f1ff'));
    // océano
    const og = new THREE.PlaneGeometry(120, 120, 80, 80); og.rotateX(-Math.PI / 2);
    const ocean = mesh(og, toon(tormenta ? '#2f4f6b' : '#2a7fb8'), { y: -1.3, cast: false });
    g.add(ocean);
    const base = og.attributes.position.array.slice();
    // cubierta
    const deck = new THREE.Group();
    deck.add(mesh(new THREE.BoxGeometry(40, 0.3, 34), texMat(tex.tablas('#a8743f', [3, 30])), { y: -0.15, z: 14, cast: false }));
    deck.add(box(16, 1.6, 0.4, '#6b4423', { z: -3.1, y: -0.8 }));
    for (let x = -7.5; x <= 7.5; x += 1.5) deck.add(cyl(0.06, 0.06, 1, '#5a3a1e', { x, z: -2.8 }, 8));
    deck.add(box(16, 0.12, 0.12, '#5a3a1e', { z: -2.8, y: 1.0 }));
    const mast = new THREE.Group(); mast.position.set(2.5, 0, -1.8);
    mast.add(cyl(0.18, 0.22, 10, '#7a4a24'));
    const sail = mesh(new THREE.PlaneGeometry(4, 4.5, 8, 8), toon('#f4efe1', { side: THREE.DoubleSide }), { y: 5.8, z: 0.3 });
    mast.add(sail); mast.add(cyl(0.08, 0.08, 4.6, '#7a4a24', { y: 8.1, rz: Math.PI / 2 }, 8));
    deck.add(mast);
    for (const x of [-4.5, -3.6]) deck.add(cyl(0.38, 0.38, 0.9, '#8b5a2b', { x, z: -2.2 }));
    g.add(deck);
    lights(g, { key: noche ? '#9db4ff' : '#fff1d6', keyI: tormenta ? 1.0 : noche ? 0.8 : 2.6, hemiTop: tormenta ? '#8794a6' : '#cfe8ff', hemiBottom: '#2a5f80', hemiI: 1.0, shadowArea: 14 });
    const pos = og.attributes.position;
    const amp = tormenta ? 0.4 : 0.15;
    return {
      group: g, bg: '#6ec3f4', fog: [tormenta ? '#7d8a99' : '#cfeaff', 25, 90],
      update: (t, p = 0) => {
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], z = base[i * 3 + 2];
          pos.array[i * 3 + 1] = Math.sin(x * 0.35 + t * 1.6) * amp + Math.cos(z * 0.4 + t * 1.2) * amp * 0.8;
        }
        pos.needsUpdate = true; og.computeVertexNormals();
        deck.rotation.z = Math.sin(t * 0.9) * (tormenta ? 0.05 : 0.015);
        deck.rotation.x = Math.sin(t * 0.7) * (tormenta ? 0.025 : 0.008);
        sail.scale.z = 1 + Math.sin(t * 2) * 0.15;
        if (hundir) { const k = Math.max(0, (p - 0.3) / 0.7) ** 2; deck.position.y = -k * 1.1; deck.rotation.z += k * 0.25; }
      },
      rocking: deck,
    };
  },

  desierto({ piramides = true } = {}) {
    const g = new THREE.Group();
    g.add(sky('#f7b267', '#fde2b8'));
    g.add(floor(texMat(tex.ruido('#e5b876', 0.08, [12, 12])), 120, 120));
    const r = rng('dunas');
    for (let i = 0; i < 9; i++) g.add(mesh(new THREE.SphereGeometry(6, 24, 12), toon('#dcae6c'), { x: -30 + i * 8, y: -4.2 - r() * 1.5, z: -14 - r() * 10, s: [1.6, 1, 1], cast: false }));
    if (piramides) for (const [x, z, s] of [[-6, -16, 6], [4, -22, 8], [12, -18, 4.5]]) g.add(mesh(new THREE.ConeGeometry(s, s * 1.05, 4), toon('#d9a65a'), { x, y: (s * 1.05) / 2, z, ry: Math.PI / 4 }));
    for (const [x, z] of [[-3.5, -2.5], [4, -3.5]]) {
      const c = new THREE.Group(); c.position.set(x, 0, z);
      c.add(cyl(0.25, 0.28, 2.2, '#4f8f3a')); c.add(cyl(0.15, 0.15, 0.8, '#4f8f3a', { x: 0.45, y: 0.8 })); c.add(cyl(0.15, 0.15, 0.6, '#4f8f3a', { x: -0.45, y: 1.1 }));
      g.add(c);
    }
    g.add(sphere(3, new THREE.MeshBasicMaterial({ color: '#fff3c4', fog: false }), { x: 14, y: 22, z: -60, cast: false }));
    lights(g, { key: '#fff0d0', keyI: 3, keyPos: [8, 12, 6], hemiTop: '#ffe8c4', hemiBottom: '#b8864d', shadowArea: 16 });
    return { group: g, bg: '#f7b267', fog: ['#fde2b8', 30, 110] };
  },

  laboratorio() {
    const g = new THREE.Group();
    g.add(floor(texMat(tex.baldosa('#f2f4f5', '#d5dde2', [10, 10]))));
    const wall = toon('#d8e6ea'); g.add(backWall(wall)); g.add(...sideWalls(wall, { x: 6 }));
    const table = new THREE.Group(); table.position.set(-1.8, 0, -1.6);
    table.add(box(3.6, 0.1, 1.1, '#f4f4f4', { y: 1.0 })); for (const x of [-1.7, 1.7]) table.add(box(0.1, 1.0, 1, '#7d8b91', { x }));
    const cols = ['#4cc9f0', '#f72585', '#b5e48c', '#ffd166'];
    cols.forEach((c, i) => {
      table.add(cyl(0.12, 0.25, 0.45, toon('#ffffff', { transparent: true, opacity: 0.5 }), { x: -1.2 + i * 0.75, y: 1.05 }));
      table.add(cyl(0.1, 0.22, 0.25, toon(c, { emissive: c, emissiveIntensity: 0.4 }), { x: -1.2 + i * 0.75, y: 1.07 }));
    });
    g.add(table);
    const shelf = new THREE.Group(); shelf.position.set(2.4, 0, -2.6);
    for (let i = 0; i < 3; i++) shelf.add(box(2.4, 0.08, 0.5, '#9aa7ad', { y: 1.4 + i * 0.8 }));
    for (let i = 0; i < 9; i++) shelf.add(box(0.25, 0.5, 0.25, cols[i % 4], { x: -0.9 + (i % 3) * 0.9, y: 1.45 + Math.floor(i / 3) * 0.8 }));
    g.add(shelf);
    const board = windowFrame(2.6, 1.6, '#2f4f4f', '#7d8b91'); board.position.set(-1.2, 3.2, -2.95); g.add(board);
    lights(g, { key: '#f4fbff', keyI: 2.2, hemiTop: '#ffffff', hemiBottom: '#9fb3bb' });
    return { group: g, bg: '#d8e6ea' };
  },

  oficina() {
    const g = new THREE.Group();
    g.add(floor(toon('#7a8b99')));
    const wall = toon('#efe6d6'); g.add(backWall(wall)); g.add(...sideWalls(wall, { x: 6 }));
    const win = windowFrame(3, 2.2, '#a9dcf7', '#ffffff'); win.position.set(1.6, 3, -2.95); g.add(win);
    const desk = new THREE.Group(); desk.position.set(-1.6, 0, -1.4);
    desk.add(box(2.8, 0.12, 1.2, '#8b5a3c', { y: 1.0 })); desk.add(box(2.6, 0.95, 0.1, '#7a4a2e', { z: -0.5 }));
    desk.add(box(0.9, 0.6, 0.06, '#222', { y: 1.45, z: -0.2 })); desk.add(box(0.8, 0.5, 0.02, toon('#6fb7ff', { emissive: '#2f7fcf', emissiveIntensity: 0.6 }), { y: 1.5, z: -0.16 }));
    desk.add(box(0.15, 0.3, 0.15, '#333', { y: 1.06, z: -0.2 }));
    g.add(desk);
    const plant = new THREE.Group(); plant.position.set(3.6, 0, -2.2); plant.add(cyl(0.3, 0.25, 0.6, '#c96f4a')); plant.add(sphere(0.55, '#3f8f3a', { y: 0.6 })); g.add(plant);
    lights(g, { key: '#fff8ee', keyI: 2.2 });
    return { group: g, bg: '#efe6d6' };
  },

  bosque({ noche = false } = {}) {
    const g = new THREE.Group();
    g.add(sky(noche ? '#0b1533' : '#8fd3f5', noche ? '#22305a' : '#e6f7ff'));
    g.add(floor(texMat(tex.ruido('#6aa84f', 0.1, [14, 14])), 120, 120));
    const r = rng('bosque');
    for (let i = 0; i < 26; i++) {
      const x = -16 + r() * 32, z = -3 - r() * 14;
      g.add(tree(x, z, 0.8 + r() * 0.9, ['#3f8f3a', '#2f7a33', '#4f9f45'][i % 3]));
    }
    for (let i = 0; i < 6; i++) g.add(sphere(0.3 + r() * 0.3, '#8d8d8d', { x: -5 + r() * 10, z: -1.5 - r() * 2, y: -0.1, s: [1.3, 0.7, 1] }));
    lights(g, { key: noche ? '#9db4ff' : '#fff4e0', keyI: noche ? 0.6 : 2.5, hemiTop: noche ? '#3b4f8a' : '#dff3ff', hemiBottom: '#3f6b2a', hemiI: noche ? 0.5 : 1.1, shadowArea: 16 });
    return { group: g, bg: '#8fd3f5', fog: [noche ? '#22305a' : '#d6efff', 14, 60] };
  },

  ferrocarril() {
    const g = new THREE.Group();
    g.add(sky('#7ec8f2', '#e2f4ff'));
    g.add(floor(texMat(tex.ruido('#9c8a6a', 0.12, [12, 12])), 120, 120));
    g.add(box(60, 0.15, 2.4, '#7d7468', { z: -1.6 }));
    for (let x = -30; x < 30; x += 0.8) g.add(box(0.25, 0.1, 2.0, '#5a3a22', { x, z: -1.6, y: 0.15 }));
    for (const z of [-2.2, -1.0]) g.add(box(60, 0.12, 0.1, '#8a8f94', { z, y: 0.25 }));
    for (const [x, z, s] of [[-14, -30, 9], [2, -36, 12], [16, -28, 8]]) g.add(mesh(new THREE.ConeGeometry(s, s * 0.9, 6), toon('#7f9a6d'), { x, y: s * 0.45, z }));
    for (let i = 0; i < 8; i++) g.add(tree(-14 + i * 4, -7 - (i % 3), 0.9));
    lights(g, { key: '#fff4e0', keyI: 2.6, shadowArea: 16 });
    return { group: g, bg: '#7ec8f2', fog: ['#e2f4ff', 30, 100] };
  },

  castillo() {
    const g = new THREE.Group();
    g.add(floor(texMat(tex.piedra('#8a8178', [10, 10]))));
    const wall = texMat(tex.piedra('#9c948a', [6, 3])); g.add(backWall(wall)); g.add(...sideWalls(wall, { x: 6 }));
    // trono y estandartes
    const throne = new THREE.Group(); throne.position.set(0, 0, -2.3);
    throne.add(box(1.8, 0.3, 1.4, '#6b4423')); throne.add(box(1.3, 0.6, 1, '#8e1b1b', { y: 0.3 })); throne.add(box(1.3, 2.4, 0.25, '#c9a227', { y: 0.3, z: -0.45 }));
    g.add(throne);
    for (const x of [-3, 3]) {
      g.add(plane(1.1, 2.6, toon('#8e1b1b', { side: THREE.DoubleSide }), { x, y: 3.6, z: -2.9 }));
      g.add(sphere(0.18, '#f2c230', { x, y: 2.15, z: -2.85 }));
      const torch = new THREE.Group(); torch.position.set(x * 1.5, 2.6, -2.8);
      torch.add(cyl(0.06, 0.04, 0.5, '#5a3a1e', {}, 8)); torch.add(sphere(0.12, toon('#ff9f1c', { emissive: '#ff6a00', emissiveIntensity: 1.5 }), { y: 0.45 }));
      g.add(torch, lamp(x * 1.5, 3.2, -2.3, '#ff9b4a', 10, 8));
    }
    g.add(box(1.8, 0.02, 6, '#8e1b1b', { z: 0.5, cast: false })); // alfombra
    lights(g, { key: '#ffe9c4', keyI: 1.8, hemiTop: '#d9cbb3', hemiBottom: '#4a3f36', hemiI: 0.8 });
    return { group: g, bg: '#6b6259' };
  },

  casa() {
    const g = new THREE.Group();
    g.add(floor(texMat(tex.tablas('#b07d4f', [8, 8]))));
    const wall = toon('#f2d7b6'); g.add(backWall(wall)); g.add(...sideWalls(wall, { x: 6 }));
    const win = windowFrame(1.8, 1.6, '#a9dcf7', '#ffffff'); win.position.set(2.2, 2.8, -2.95); g.add(win);
    const sofa = new THREE.Group(); sofa.position.set(-2.2, 0, -2.2);
    sofa.add(box(2.6, 0.5, 1, '#4a7fb5')); sofa.add(box(2.6, 0.9, 0.3, '#3f6e9e', { z: -0.4, y: 0.4 })); for (const x of [-1.25, 1.25]) sofa.add(box(0.3, 0.75, 1, '#3f6e9e', { x }));
    g.add(sofa);
    g.add(box(2.4, 0.02, 1.8, '#c0504d', { z: 0.4, cast: false }));
    const frame = windowFrame(1, 0.8, '#e9c46a', '#5a3a22'); frame.position.set(-2.2, 2.9, -2.95); g.add(frame);
    const lampG = new THREE.Group(); lampG.position.set(0.3, 0, -2.5); lampG.add(cyl(0.05, 0.05, 1.8, '#333', {}, 8)); lampG.add(cyl(0.2, 0.4, 0.4, '#f6e7c1', { y: 1.8 })); g.add(lampG);
    lights(g, { key: '#fff3df', keyI: 2.1 });
    g.add(lamp(0.3, 2.2, -2, '#ffd59a', 6, 6));
    return { group: g, bg: '#f2d7b6' };
  },

  templo() {
    const g = new THREE.Group();
    g.add(sky('#8ecae6', '#f1f7fa'));
    g.add(floor(texMat(tex.piedra('#e3dccb', [10, 10]))));
    g.add(box(14, 0.4, 3, '#ddd5c3', { z: -3 })); g.add(box(14, 0.4, 2.4, '#e8e1d0', { z: -3.2, y: 0.4 }));
    for (let x = -6; x <= 6; x += 2) {
      const c = new THREE.Group(); c.position.set(x, 0.8, -3.2);
      c.add(cyl(0.38, 0.42, 5.2, '#f2ede0', {}, 20)); c.add(box(1, 0.3, 1, '#e8e1d0', { y: 5.2 }));
      g.add(c);
    }
    g.add(box(14, 0.7, 2.6, '#e8e1d0', { z: -3.2, y: 6.3 }));
    g.add(mesh(new THREE.CylinderGeometry(0.01, 7.4, 1.6, 3, 1), toon('#e3dccb'), { y: 7.8, z: -3.2, rz: 0, ry: Math.PI / 2, s: [1, 1, 0.2] }));
    for (const x of [-9, 9]) g.add(tree(x, -6, 1.1, '#5c8a3a'));
    lights(g, { key: '#fff4e0', keyI: 2.6, shadowArea: 14 });
    return { group: g, bg: '#8ecae6', fog: ['#f1f7fa', 25, 80] };
  },
};

export const SET_TYPES = Object.keys(SETS);

export function createSet(name, opts = {}) {
  const fn = SETS[name] || SETS.estudio;
  const s = fn(opts);
  s.update = s.update || (() => {});
  return s;
}
