// Personajes 2D planos (estilo caricatura) dentro de los sets 3D.
// Cada personaje es un grupo de planos con textura dibujada en canvas:
// piernas, torso, brazos, cabeza, ojos y boca, que se animan por separado.
import * as THREE from 'three';
import { canvasTexture, roundRect, shade, hash, clamp, easeOut, easeOutBack, lerp } from './util.js';

const PPU = 320;            // píxeles por unidad del mundo
const INK = '#1e1a18';      // color del contorno
const LW = 9;               // grosor del contorno (px)

// ---------- Presets de personajes ----------
const SKIN = { clara: '#f6d0b1', media: '#e0a878', morena: '#b9794d', oscura: '#7a4a2c' };
export const PRESETS = {
  hombre:     { pelo: 'corto', colorPelo: '#3b2a1e', camisa: '#3a7bd5', pantalon: '#2d3a4a' },
  mujer:      { pelo: 'largo', colorPelo: '#6b3a1e', camisa: '#d94f70', pantalon: '#3b3b5c', falda: true },
  nino:       { pelo: 'corto', colorPelo: '#5a3a1e', camisa: '#f2a531', pantalon: '#3a5fa0', escala: 0.72 },
  nina:       { pelo: 'coletas', colorPelo: '#3b2a1e', camisa: '#9b5de5', pantalon: '#3a5fa0', falda: true, escala: 0.72 },
  anciano:    { pelo: 'calvo', colorPelo: '#e8e8e8', barba: 'larga', colorBarba: '#eeeeee', camisa: '#8d7b68', pantalon: '#4a4036' },
  preso:      { pelo: 'rapado', colorPelo: '#2b2420', camisa: 'rayas', pantalon: 'rayas', barba: 'sombra' },
  guardia:    { pelo: 'corto', colorPelo: '#2b2420', camisa: '#2f4a6d', pantalon: '#1f2f45', sombrero: 'policia', corbata: '#111' },
  policia:    { pelo: 'corto', colorPelo: '#2b2420', camisa: '#2f4a6d', pantalon: '#1f2f45', sombrero: 'policia', corbata: '#111' },
  marinero:   { pelo: 'corto', colorPelo: '#7a4a24', camisa: 'marinero', pantalon: '#f2f2f2', sombrero: 'marinero' },
  capitan:    { pelo: 'corto', colorPelo: '#ddd', barba: 'completa', colorBarba: '#ddd', camisa: '#1f2f55', pantalon: '#1f2f55', sombrero: 'capitan', botones: '#e8c547' },
  pirata:     { pelo: 'largo', colorPelo: '#1b1b1b', barba: 'completa', colorBarba: '#1b1b1b', camisa: '#b3302d', pantalon: '#3b2a1e', sombrero: 'pirata', parche: true },
  cientifico: { pelo: 'loco', colorPelo: '#d9d9d9', camisa: 'bata', pantalon: '#3d3d3d', lentes: true },
  obrero:     { pelo: 'corto', colorPelo: '#3b2a1e', camisa: '#f26b1d', pantalon: '#2d4b73', sombrero: 'casco', barba: 'bigote' },
  soldado:    { pelo: 'rapado', colorPelo: '#3b2a1e', camisa: '#55613a', pantalon: '#4a5532', sombrero: 'militar' },
  rey:        { pelo: 'corto', colorPelo: '#8a5a2b', barba: 'completa', colorBarba: '#8a5a2b', camisa: '#7b2cbf', pantalon: '#3c1a5b', sombrero: 'corona', capa: '#c1121f' },
  reina:      { pelo: 'largo', colorPelo: '#c08a3e', camisa: '#c1121f', pantalon: '#7b2cbf', falda: true, sombrero: 'corona' },
  chef:       { pelo: 'corto', colorPelo: '#3b2a1e', camisa: '#f4f4f4', pantalon: '#333', sombrero: 'chef', barba: 'bigote' },
  vaquero:    { pelo: 'corto', colorPelo: '#6b3a1e', camisa: '#c0583a', pantalon: '#35507a', sombrero: 'vaquero', barba: 'bigote' },
  granjero:   { pelo: 'corto', colorPelo: '#a0522d', camisa: '#d64545', pantalon: '#3a6ea5', sombrero: 'paja', overol: '#3a6ea5' },
  ejecutivo:  { pelo: 'peinado', colorPelo: '#2b2420', camisa: '#2b2d42', pantalon: '#2b2d42', corbata: '#c1121f' },
  doctor:     { pelo: 'corto', colorPelo: '#3b2a1e', camisa: 'bata', pantalon: '#4a6fa5' },
  romano:     { pelo: 'corto', colorPelo: '#3b2a1e', camisa: '#e9e2cf', pantalon: '#e9e2cf', sombrero: 'laurel', capa: '#a4161a', piernasDesnudas: true },
  egipcio:    { pelo: 'egipcio', colorPelo: '#111', camisa: '#f1e6c8', pantalon: '#f1e6c8', piel: 'morena', piernasDesnudas: true, collar: '#e8c547' },
  vikingo:    { pelo: 'largo', colorPelo: '#d9a441', barba: 'larga', colorBarba: '#d9a441', camisa: '#6b4f2e', pantalon: '#4a3b2a', sombrero: 'vikingo' },
  explorador: { pelo: 'corto', colorPelo: '#6b3a1e', camisa: '#c2a878', pantalon: '#8a7350', sombrero: 'safari' },
};

const ANIMALS = new Set(['gato', 'perro', 'rata', 'loro', 'caballo', 'gallina']);

// ---------- Construcción de partes ----------
function part(w, h, draw, pivotX, pivotY) {
  // Plano de w×h unidades; el pivote (en unidades, desde la esquina inferior izquierda) queda en el origen.
  const tex = canvasTexture(Math.round(w * PPU), Math.round(h * PPU), draw);
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(w / 2 - pivotX, h / 2 - pivotY, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function variants(w, h, draws, pivotX, pivotY) {
  // Varias texturas intercambiables sobre el mismo plano (ojos, bocas).
  const m = part(w, h, draws[Object.keys(draws)[0]], pivotX, pivotY);
  m.userData.tex = {};
  for (const [k, d] of Object.entries(draws)) m.userData.tex[k] = canvasTexture(Math.round(w * PPU), Math.round(h * PPU), d);
  m.userData.set = (k) => { const t = m.userData.tex[k]; if (t && m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; } };
  m.castShadow = false;
  return m;
}

const stroke = (g, fill, lw = LW) => { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); };

function fillPattern(g, color, x, y, w, h) {
  if (color === 'rayas') {
    g.save(); g.clip();
    g.fillStyle = '#f4f1e8'; g.fillRect(x, y, w, h);
    g.fillStyle = '#26221f';
    for (let yy = y; yy < y + h; yy += 44) g.fillRect(x, yy, w, 22);
    g.restore();
  } else { g.fillStyle = color; g.fill(); }
}

function drawLeg(c) {
  return (g, W, H) => {
    const pants = c.pantalon;
    const shoeH = 0.12 * PPU;
    g.beginPath(); roundRect(g, LW, LW, W - 2 * LW, H - shoeH - LW, 18);
    if (c.piernasDesnudas) { g.fillStyle = c.piel; g.fill(); } else fillPattern(g, pants, 0, 0, W, H);
    g.lineWidth = LW; g.strokeStyle = INK; g.stroke();
    // zapato (apunta hacia +x, la dirección a la que mira el personaje)
    g.beginPath(); roundRect(g, LW, H - shoeH - LW * 1.5, W * 1.45, shoeH, 20);
    stroke(g, c.piernasDesnudas ? '#8a5a2b' : '#2a201a');
  };
}

function drawTorso(c) {
  return (g, W, H) => {
    const shirt = c.camisa;
    const base = shirt === 'bata' ? '#f7f7f7' : shirt === 'marinero' ? '#fafafa' : shirt;
    // cuello
    g.beginPath(); roundRect(g, W * 0.38, 0, W * 0.24, H * 0.2, 10); stroke(g, c.piel);
    // cuerpo
    g.beginPath(); roundRect(g, LW, H * 0.08, W - 2 * LW, H * 0.92 - LW, 50);
    fillPattern(g, base, 0, 0, W, H);
    g.lineWidth = LW; g.strokeStyle = INK; g.stroke();
    g.save(); g.beginPath(); roundRect(g, LW, H * 0.08, W - 2 * LW, H * 0.92 - LW, 50); g.clip();
    if (shirt === 'bata') { // bata de laboratorio: solapas y camisa debajo
      g.fillStyle = '#7fa7d9'; g.beginPath(); g.moveTo(W * 0.36, H * 0.08); g.lineTo(W * 0.5, H * 0.45); g.lineTo(W * 0.64, H * 0.08); g.fill();
      g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(W * 0.5, H * 0.45); g.lineTo(W * 0.5, H); g.stroke();
    }
    if (shirt === 'marinero') { // cuello azul de marinero
      g.fillStyle = '#1f3d7a'; g.beginPath(); g.moveTo(W * 0.15, H * 0.08); g.lineTo(W * 0.5, H * 0.42); g.lineTo(W * 0.85, H * 0.08); g.fill();
      g.fillStyle = '#d62828'; g.beginPath(); g.moveTo(W * 0.42, H * 0.36); g.lineTo(W * 0.58, H * 0.36); g.lineTo(W * 0.5, H * 0.5); g.fill();
      g.fillStyle = '#1f3d7a'; for (let i = 0; i < 2; i++) g.fillRect(0, H * (0.82 + i * 0.07), W, H * 0.03);
    }
    if (c.overol) {
      g.fillStyle = c.overol; g.fillRect(W * 0.18, H * 0.45, W * 0.64, H);
      g.fillRect(W * 0.22, H * 0.08, W * 0.1, H * 0.4); g.fillRect(W * 0.68, H * 0.08, W * 0.1, H * 0.4);
    }
    if (c.corbata) {
      g.fillStyle = c.corbata; g.beginPath();
      g.moveTo(W * 0.46, H * 0.12); g.lineTo(W * 0.54, H * 0.12); g.lineTo(W * 0.57, H * 0.6); g.lineTo(W * 0.5, H * 0.7); g.lineTo(W * 0.43, H * 0.6); g.closePath();
      g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    }
    if (c.botones) { g.fillStyle = c.botones; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(W * 0.5, H * (0.25 + i * 0.17), 10, 0, 7); g.fill(); } }
    if (c.collar) { g.fillStyle = c.collar; g.beginPath(); g.ellipse(W * 0.5, H * 0.1, W * 0.36, H * 0.18, 0, 0, Math.PI); g.fill(); }
    // cinturón
    if (!c.falda && !c.overol && shirt !== 'bata') { g.fillStyle = '#2a201a'; g.fillRect(0, H * 0.86, W, H * 0.08); g.fillStyle = '#d9b44a'; g.fillRect(W * 0.45, H * 0.86, W * 0.1, H * 0.08); }
    g.restore();
    g.beginPath(); roundRect(g, LW, H * 0.08, W - 2 * LW, H * 0.92 - LW, 50); g.lineWidth = LW; g.strokeStyle = INK; g.stroke();
  };
}

function drawSkirt(c) {
  return (g, W, H) => {
    g.beginPath(); g.moveTo(W * 0.2, LW); g.lineTo(W * 0.8, LW); g.lineTo(W - LW, H - LW); g.lineTo(LW, H - LW); g.closePath();
    stroke(g, shade(c.camisa === 'rayas' ? '#444' : c.camisa, -0.25));
  };
}

function drawCape(c) {
  return (g, W, H) => {
    g.beginPath(); g.moveTo(W * 0.25, LW); g.lineTo(W * 0.75, LW); g.lineTo(W - LW, H - LW); g.lineTo(LW, H - LW); g.closePath();
    stroke(g, c.capa);
  };
}

function drawArm(c) {
  return (g, W, H) => {
    const sleeve = c.camisa === 'bata' ? '#f7f7f7' : c.camisa === 'marinero' ? '#fafafa' : c.camisa;
    const handR = W * 0.36;
    g.beginPath(); roundRect(g, W * 0.16, LW, W * 0.68, H - handR * 1.6, 30);
    if (c.piernasDesnudas) { g.fillStyle = c.piel; g.fill(); } else fillPattern(g, sleeve, 0, 0, W, H);
    g.lineWidth = LW; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(W / 2, H - handR - LW, handR, 0, 7); stroke(g, c.piel);
  };
}

function drawHead(c) {
  return (g, W, H) => {
    const cx = W / 2, cy = H * 0.56, r = 0.31 * PPU;
    const hair = c.colorPelo;
    // pelo de atrás (largo / coletas / egipcio)
    if (c.pelo === 'largo') { g.beginPath(); roundRect(g, cx - r * 1.12, cy - r * 1.05, r * 2.24, r * 2.3, r); stroke(g, hair); }
    if (c.pelo === 'egipcio') { g.beginPath(); roundRect(g, cx - r * 1.2, cy - r * 1.1, r * 2.4, r * 2.0, 20); stroke(g, hair); }
    if (c.pelo === 'coletas') for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 1.15, cy, r * 0.3, r * 0.55, s * 0.4, 0, 7); stroke(g, hair); }
    // orejas
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.98, cy + r * 0.05, r * 0.18, r * 0.24, 0, 0, 7); stroke(g, c.piel); }
    // cara
    g.beginPath(); g.ellipse(cx, cy, r, r * 1.04, 0, 0, 7); stroke(g, c.piel);
    // sombra de barba / barba
    if (c.barba === 'sombra') { g.save(); g.beginPath(); g.ellipse(cx, cy, r - LW / 2, r * 1.04 - LW / 2, 0, 0, 7); g.clip(); g.fillStyle = 'rgba(60,50,40,0.28)'; g.beginPath(); g.ellipse(cx, cy + r * 0.75, r * 0.85, r * 0.55, 0, 0, 7); g.fill(); g.restore(); }
    if (c.barba === 'completa' || c.barba === 'larga') {
      const len = c.barba === 'larga' ? 1.25 : 0.75;
      g.beginPath(); g.moveTo(cx - r * 0.95, cy); g.quadraticCurveTo(cx - r * 0.9, cy + r * (0.6 + len), cx, cy + r * (0.7 + len));
      g.quadraticCurveTo(cx + r * 0.9, cy + r * (0.6 + len), cx + r * 0.95, cy);
      g.quadraticCurveTo(cx, cy + r * 0.55, cx - r * 0.95, cy); stroke(g, c.colorBarba || hair);
    }
    // nariz
    g.beginPath(); g.ellipse(cx + r * 0.08, cy + r * 0.18, r * 0.13, r * 0.11, 0, 0, 7); stroke(g, shade(c.piel, -0.12), 6);
    // pelo de arriba
    g.fillStyle = hair; g.strokeStyle = INK; g.lineWidth = LW;
    const top = () => { g.beginPath(); g.ellipse(cx, cy - r * 0.45, r * 1.02, r * 0.62, 0, Math.PI, 0); g.closePath(); };
    if (['corto', 'largo', 'coletas', 'peinado'].includes(c.pelo)) {
      top(); g.fill(); g.stroke();
      if (c.pelo === 'peinado') { g.beginPath(); g.ellipse(cx - r * 0.2, cy - r * 0.95, r * 0.7, r * 0.22, -0.2, 0, 7); g.fill(); g.stroke(); }
      if (c.pelo === 'corto') { g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(cx + i * r * 0.32, cy - r * 0.5); g.lineTo(cx + i * r * 0.32 + r * 0.14, cy - r * 0.3); } g.lineWidth = 6; g.stroke(); }
    }
    if (c.pelo === 'rapado') { g.globalAlpha = 0.75; top(); g.fill(); g.globalAlpha = 1; g.stroke(); }
    if (c.pelo === 'calvo') { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.9, cy - r * 0.25, r * 0.2, r * 0.35, 0, 0, 7); g.fill(); g.stroke(); } }
    if (c.pelo === 'loco') { g.beginPath(); for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.ellipse(cx + Math.cos(a) * r * 1.05, cy - r * 0.2 + Math.sin(a) * r * 0.95, r * 0.28, r * 0.22, a, 0, 7); } g.fill(); g.stroke(); top(); g.fill(); }
    if (c.pelo === 'egipcio') { g.beginPath(); g.ellipse(cx, cy - r * 0.4, r * 1.08, r * 0.7, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); }
    drawHat(g, c.sombrero, cx, cy, r);
  };
}

function drawHat(g, hat, cx, cy, r) {
  const brim = (y, w, h, col) => { g.beginPath(); g.ellipse(cx, y, w, h, 0, 0, 7); stroke(g, col); };
  const crown = (y, w, h, col, rad = 20) => { g.beginPath(); roundRect(g, cx - w / 2, y - h, w, h, rad); stroke(g, col); };
  const ty = cy - r * 0.6;
  switch (hat) {
    case 'policia': crown(ty + 6, r * 2.0, r * 0.7, '#1f2f45'); g.fillStyle = '#e8c547'; g.beginPath(); g.arc(cx, ty - r * 0.35, r * 0.15, 0, 7); g.fill(); g.beginPath(); roundRect(g, cx - r * 1.1, ty - 4, r * 2.2, r * 0.25, 12); stroke(g, '#111'); break;
    case 'capitan': crown(ty + 6, r * 2.0, r * 0.65, '#f4f4f4'); g.beginPath(); roundRect(g, cx - r * 1.1, ty - 4, r * 2.2, r * 0.25, 12); stroke(g, '#111'); g.fillStyle = '#e8c547'; g.beginPath(); g.arc(cx, ty - r * 0.3, r * 0.14, 0, 7); g.fill(); break;
    case 'marinero': g.beginPath(); g.ellipse(cx, ty - 4, r * 0.95, r * 0.45, 0, Math.PI, 0); g.closePath(); stroke(g, '#fafafa'); brim(ty, r * 1.0, r * 0.14, '#fafafa'); break;
    case 'pirata': g.beginPath(); g.moveTo(cx - r * 1.5, ty + 4); g.quadraticCurveTo(cx - r * 0.9, ty - r * 1.3, cx, ty - r * 0.85); g.quadraticCurveTo(cx + r * 0.9, ty - r * 1.3, cx + r * 1.5, ty + 4); g.closePath(); stroke(g, '#1b1b1b');
      g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(cx, ty - r * 0.45, r * 0.18, 0, 7); g.fill(); break;
    case 'casco': g.beginPath(); g.ellipse(cx, ty + 10, r * 1.05, r * 0.85, 0, Math.PI, 0); g.closePath(); stroke(g, '#f2c230'); brim(ty + 10, r * 1.25, r * 0.14, '#f2c230'); break;
    case 'militar': g.beginPath(); g.ellipse(cx, ty + 12, r * 1.1, r * 0.85, 0, Math.PI, 0); g.closePath(); stroke(g, '#4a5532'); brim(ty + 12, r * 1.25, r * 0.12, '#4a5532'); break;
    case 'corona': g.beginPath(); g.moveTo(cx - r * 0.8, ty + 10); for (let i = 0; i <= 4; i++) { g.lineTo(cx - r * 0.8 + i * r * 0.4, ty - r * (i % 2 ? 0.25 : 0.7)); } g.lineTo(cx + r * 0.8, ty + 10); g.closePath(); stroke(g, '#f2c230'); break;
    case 'chef': crown(ty + 8, r * 1.5, r * 0.6, '#ffffff', 6); for (const dx of [-0.5, 0, 0.5]) { g.beginPath(); g.arc(cx + dx * r, ty - r * 0.75, r * 0.45, 0, 7); stroke(g, '#ffffff'); } g.fillStyle = '#fff'; g.fillRect(cx - r * 0.7, ty - r * 0.7, r * 1.4, r * 0.6); break;
    case 'vaquero': brim(ty + 4, r * 1.6, r * 0.28, '#8b5a2b'); crown(ty, r * 1.3, r * 0.75, '#8b5a2b', 30); g.fillStyle = '#3b2a1e'; g.fillRect(cx - r * 0.62, ty - r * 0.22, r * 1.24, r * 0.16); break;
    case 'paja': brim(ty + 4, r * 1.6, r * 0.28, '#e3c16f'); crown(ty, r * 1.2, r * 0.6, '#e3c16f', 30); g.fillStyle = '#c1121f'; g.fillRect(cx - r * 0.57, ty - r * 0.2, r * 1.14, r * 0.14); break;
    case 'safari': g.beginPath(); g.ellipse(cx, ty + 6, r * 1.0, r * 0.8, 0, Math.PI, 0); g.closePath(); stroke(g, '#d8c79c'); brim(ty + 6, r * 1.35, r * 0.16, '#d8c79c'); break;
    case 'copa': brim(ty + 4, r * 1.3, r * 0.2, '#1b1b1b'); crown(ty, r * 1.2, r * 1.1, '#1b1b1b', 8); g.fillStyle = '#c1121f'; g.fillRect(cx - r * 0.57, ty - r * 0.3, r * 1.14, r * 0.16); break;
    case 'gorra': g.beginPath(); g.ellipse(cx, ty + 10, r * 1.02, r * 0.75, 0, Math.PI, 0); g.closePath(); stroke(g, '#d62828'); g.beginPath(); g.ellipse(cx + r * 0.75, ty + 8, r * 0.7, r * 0.14, 0, 0, 7); stroke(g, '#d62828'); break;
    case 'laurel': g.strokeStyle = '#4c8a3a'; g.lineWidth = 14; g.beginPath(); g.ellipse(cx, cy - r * 0.2, r * 1.02, r * 0.85, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); break;
    case 'vikingo': g.beginPath(); g.ellipse(cx, ty + 12, r * 1.05, r * 0.85, 0, Math.PI, 0); g.closePath(); stroke(g, '#9aa0a6');
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r * 0.85, ty - r * 0.1); g.quadraticCurveTo(cx + s * r * 1.5, ty - r * 0.4, cx + s * r * 1.3, ty - r * 1.1); g.lineTo(cx + s * r * 0.95, ty - r * 0.35); g.closePath(); stroke(g, '#f4ecd8'); } break;
  }
}

function drawEyes(c, kind) {
  return (g, W, H) => {
    const ey = H * 0.62, dx = W * 0.22, rx = W * 0.13, ry = H * 0.28;
    const look = W * 0.03;
    for (const s of [-1, 1]) {
      const x = W / 2 + s * dx;
      if (c.parche && s === -1) { g.fillStyle = INK; g.beginPath(); g.ellipse(x, ey, rx * 1.05, ry * 0.85, 0, 0, 7); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(x - rx * 1.6, ey - ry * 1.2); g.lineTo(x + rx * 1.8, ey - ry * 0.6); g.stroke(); continue; }
      if (kind === 'cerrados' || kind === 'feliz') {
        g.lineWidth = 10; g.strokeStyle = INK; g.beginPath();
        if (kind === 'feliz') g.arc(x, ey + ry * 0.3, rx * 0.8, Math.PI * 1.15, Math.PI * 1.85); else g.arc(x, ey - ry * 0.2, rx * 0.8, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      } else {
        const big = kind === 'abiertos' ? 1.25 : 1;
        g.beginPath(); g.ellipse(x, ey, rx * big, ry * big, 0, 0, 7); stroke(g, '#ffffff', 5);
        const pr = kind === 'abiertos' ? rx * 0.38 : rx * 0.52;
        g.fillStyle = INK; g.beginPath(); g.arc(x + look, ey + ry * 0.12, pr, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x + look + pr * 0.35, ey - pr * 0.2, pr * 0.3, 0, 7); g.fill();
      }
      // cejas
      g.lineWidth = 11; g.lineCap = 'round'; g.strokeStyle = shade(c.colorPelo === '#e8e8e8' ? '#999' : c.colorPelo, -0.2);
      const by = ey - ry * 1.45;
      g.beginPath();
      // (x - s*rx) es el extremo interior de cada ceja: abajo = enojado, arriba = preocupado
      if (kind === 'enojado') { g.moveTo(x - s * rx * 1.1, by + 16); g.lineTo(x + s * rx * 0.9, by - 10); }
      else if (kind === 'preocupado') { g.moveTo(x - s * rx * 1.1, by - 12); g.lineTo(x + s * rx * 0.9, by + 10); }
      else if (kind === 'abiertos') { g.moveTo(x - rx, by - 14); g.quadraticCurveTo(x, by - 30, x + rx, by - 14); }
      else { g.moveTo(x - rx, by); g.quadraticCurveTo(x, by - 10, x + rx, by); }
      g.stroke();
    }
    if (c.lentes) {
      g.lineWidth = 8; g.strokeStyle = INK;
      for (const s of [-1, 1]) { g.beginPath(); g.arc(W / 2 + s * dx, ey, rx * 1.45, 0, 7); g.stroke(); }
      g.beginPath(); g.moveTo(W / 2 - dx + rx * 1.45, ey); g.lineTo(W / 2 + dx - rx * 1.45, ey); g.stroke();
    }
  };
}

function drawMouth(c, kind) {
  return (g, W, H) => {
    const cx = W / 2 + W * 0.04, cy = H / 2;
    g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 9;
    if (c.barba === 'bigote') { g.fillStyle = c.colorPelo; g.beginPath(); g.ellipse(cx - W * 0.13, cy - H * 0.22, W * 0.17, H * 0.16, 0.2, 0, 7); g.ellipse(cx + W * 0.13, cy - H * 0.22, W * 0.17, H * 0.16, -0.2, 0, 7); g.fill(); }
    switch (kind) {
      case 'cerrada': g.beginPath(); g.arc(cx, cy - H * 0.2, W * 0.18, Math.PI * 0.25, Math.PI * 0.75); g.stroke(); break;
      case 'sonrisa': g.beginPath(); g.moveTo(cx - W * 0.26, cy - H * 0.12); g.quadraticCurveTo(cx, cy + H * 0.55, cx + W * 0.26, cy - H * 0.12); g.closePath(); stroke(g, '#7a1f1f', 8);
        g.fillStyle = '#fff'; g.fillRect(cx - W * 0.18, cy - H * 0.1, W * 0.36, H * 0.1); break;
      case 'abierta': g.beginPath(); g.ellipse(cx, cy, W * 0.16, H * 0.3, 0, 0, 7); stroke(g, '#5a1414', 8);
        g.fillStyle = '#e0626b'; g.beginPath(); g.ellipse(cx, cy + H * 0.15, W * 0.1, H * 0.1, 0, 0, 7); g.fill(); break;
      case 'media': g.beginPath(); g.ellipse(cx, cy, W * 0.14, H * 0.15, 0, 0, 7); stroke(g, '#5a1414', 8); break;
      case 'o': g.beginPath(); g.ellipse(cx, cy, W * 0.09, H * 0.25, 0, 0, 7); stroke(g, '#5a1414', 8); break;
      case 'triste': g.beginPath(); g.arc(cx, cy + H * 0.3, W * 0.16, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); break;
      case 'dientes': g.beginPath(); roundRect(g, cx - W * 0.25, cy - H * 0.2, W * 0.5, H * 0.4, 12); stroke(g, '#fff', 8);
        g.lineWidth = 5; g.beginPath(); g.moveTo(cx - W * 0.25, cy); g.lineTo(cx + W * 0.25, cy); for (let i = -1; i <= 1; i++) { g.moveTo(cx + i * W * 0.12, cy - H * 0.2); g.lineTo(cx + i * W * 0.12, cy + H * 0.2); } g.stroke(); break;
    }
  };
}

// Objetos que el personaje puede llevar en la mano.
const ITEMS = {
  pala: (g, W, H) => { g.fillStyle = '#8b5a2b'; g.fillRect(W * 0.45, 0, W * 0.1, H * 0.7); g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(W * 0.45, 0, W * 0.1, H * 0.7); g.beginPath(); g.moveTo(W * 0.25, H * 0.68); g.lineTo(W * 0.75, H * 0.68); g.lineTo(W * 0.7, H * 0.95); g.quadraticCurveTo(W * 0.5, H, W * 0.3, H * 0.95); g.closePath(); stroke(g, '#9aa0a6', 6); },
  pico: (g, W, H) => { g.fillStyle = '#8b5a2b'; g.fillRect(W * 0.45, 0, W * 0.1, H); g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(W * 0.45, 0, W * 0.1, H); g.beginPath(); g.moveTo(W * 0.02, H * 0.92); g.quadraticCurveTo(W * 0.5, H * 0.72, W * 0.98, H * 0.92); g.lineTo(W * 0.5, H * 0.82); g.closePath(); stroke(g, '#9aa0a6', 6); },
  cuchara: (g, W, H) => { g.fillStyle = '#c0c0c0'; g.fillRect(W * 0.46, 0, W * 0.08, H * 0.75); g.beginPath(); g.ellipse(W * 0.5, H * 0.85, W * 0.14, H * 0.12, 0, 0, 7); stroke(g, '#c0c0c0', 5); },
  antorcha: (g, W, H) => { g.fillStyle = '#6b4423'; g.fillRect(W * 0.44, 0, W * 0.12, H * 0.75); g.beginPath(); g.moveTo(W * 0.5, H); g.quadraticCurveTo(W * 0.2, H * 0.8, W * 0.5, H * 0.7); g.quadraticCurveTo(W * 0.8, H * 0.8, W * 0.5, H); stroke(g, '#ff9f1c', 5); },
  espada: (g, W, H) => { g.beginPath(); g.moveTo(W * 0.44, H * 0.2); g.lineTo(W * 0.56, H * 0.2); g.lineTo(W * 0.53, H); g.lineTo(W * 0.47, H); g.closePath(); stroke(g, '#d9dde1', 5); g.fillStyle = '#c9a227'; g.fillRect(W * 0.25, H * 0.15, W * 0.5, H * 0.06); g.fillStyle = '#6b4423'; g.fillRect(W * 0.45, 0, W * 0.1, H * 0.15); },
  papel: (g, W, H) => { g.beginPath(); roundRect(g, W * 0.1, H * 0.55, W * 0.8, H * 0.42, 6); stroke(g, '#fbf6e9', 6); g.fillStyle = '#999'; for (let i = 0; i < 3; i++) g.fillRect(W * 0.2, H * (0.65 + i * 0.09), W * 0.6, 6); },
  bolsa: (g, W, H) => { g.beginPath(); g.ellipse(W * 0.5, H * 0.75, W * 0.4, H * 0.22, 0, 0, 7); stroke(g, '#c2a36b', 6); g.fillStyle = '#2e7d32'; g.font = `${H * 0.22}px LG`; g.textAlign = 'center'; g.fillText('$', W * 0.5, H * 0.83); },
  martillo: (g, W, H) => { g.fillStyle = '#8b5a2b'; g.fillRect(W * 0.45, 0, W * 0.1, H * 0.85); g.beginPath(); roundRect(g, W * 0.2, H * 0.78, W * 0.6, H * 0.2, 6); stroke(g, '#666', 6); },
  lupa: (g, W, H) => { g.fillStyle = '#3b2a1e'; g.fillRect(W * 0.45, 0, W * 0.1, H * 0.55); g.beginPath(); g.arc(W * 0.5, H * 0.75, W * 0.3, 0, 7); stroke(g, 'rgba(180,220,255,0.6)', 10); },
  llave: (g, W, H) => { g.fillStyle = '#d9b44a'; g.fillRect(W * 0.46, H * 0.3, W * 0.08, H * 0.6); g.fillRect(W * 0.54, H * 0.75, W * 0.12, H * 0.05); g.beginPath(); g.arc(W * 0.5, H * 0.25, W * 0.15, 0, 7); g.lineWidth = 14; g.strokeStyle = '#d9b44a'; g.stroke(); },
  botella: (g, W, H) => { g.beginPath(); roundRect(g, W * 0.3, H * 0.5, W * 0.4, H * 0.48, 14); stroke(g, '#2e7d32', 6); g.beginPath(); roundRect(g, W * 0.42, H * 0.3, W * 0.16, H * 0.22, 4); stroke(g, '#2e7d32', 6); },
  linterna: (g, W, H) => { g.beginPath(); roundRect(g, W * 0.3, H * 0.5, W * 0.4, H * 0.45, 8); stroke(g, '#ffd166', 6); g.fillStyle = '#3b2a1e'; g.fillRect(W * 0.3, H * 0.45, W * 0.4, H * 0.06); },
  telescopio: (g, W, H) => { g.beginPath(); roundRect(g, W * 0.38, H * 0.1, W * 0.24, H * 0.88, 8); stroke(g, '#b08d57', 6); },
  libro: (g, W, H) => { g.beginPath(); roundRect(g, W * 0.15, H * 0.6, W * 0.7, H * 0.36, 6); stroke(g, '#8e2c2c', 6); g.fillStyle = '#f4ecd8'; g.fillRect(W * 0.2, H * 0.62, W * 0.6, H * 0.04); },
};

// ---------- Personaje humano ----------
class Human {
  constructor(cfg) {
    const preset = PRESETS[cfg.tipo] || PRESETS.hombre;
    const c = { ...preset, ...cfg };
    c.piel = SKIN[c.piel] || c.piel || SKIN.clara;
    if (cfg.ropa) c.camisa = cfg.ropa;
    this.c = c;
    this.seed = hash(cfg.id || cfg.tipo || 'x');
    const g = (this.group = new THREE.Group());
    const body = (this.body = new THREE.Group()); // todo lo que se inclina/rebota
    g.add(body);
    const s = c.escala || 1;
    g.scale.setScalar(s);

    if (c.capa) { const cape = part(0.8, 1.05, drawCape(c), 0.4, 1.05); cape.position.set(0, 1.36, -0.03); body.add(cape); }
    this.legL = part(0.2, 0.76, drawLeg(c), 0.1, 0.76); this.legL.position.set(-0.13, 0.74, -0.01);
    this.legR = part(0.2, 0.76, drawLeg(c), 0.1, 0.76); this.legR.position.set(0.13, 0.74, -0.012);
    body.add(this.legL, this.legR);
    const torso = part(0.7, 0.74, drawTorso(c), 0.35, 0); torso.position.set(0, 0.64, 0.0); body.add(torso);
    this.torso = torso;
    if (c.falda) { const sk = part(0.86, 0.42, drawSkirt(c), 0.43, 0.42); sk.position.set(0, 0.8, 0.004); body.add(sk); }
    this.armL = part(0.22, 0.72, drawArm(c), 0.11, 0.7); this.armL.position.set(-0.36, 1.3, -0.006);
    this.armR = part(0.22, 0.72, drawArm(c), 0.11, 0.7); this.armR.position.set(0.36, 1.3, 0.012);
    body.add(this.armL, this.armR);

    if (c.objeto && ITEMS[c.objeto]) {
      const it = part(0.5, 0.9, ITEMS[c.objeto], 0.25, 0.9 - 0.05);
      it.position.set(0, -0.6, 0.004); // sale de la mano, siguiendo la dirección del brazo
      this.item = it; this.armR.add(it);
    }

    const head = (this.head = new THREE.Group());
    head.position.set(0, 1.36, 0.02); body.add(head);
    const hp = part(1.2, 1.3, drawHead(c), 0.6, 0.18); head.add(hp);
    this.eyes = variants(0.5, 0.26, Object.fromEntries(['normal', 'abiertos', 'cerrados', 'enojado', 'preocupado', 'feliz'].map((k) => [k, drawEyes(c, k)])), 0.25, 0.13);
    this.eyes.position.set(0, 0.62 + 0.0, 0.01); head.add(this.eyes);
    this.mouth = variants(0.34, 0.2, Object.fromEntries(['cerrada', 'sonrisa', 'abierta', 'media', 'o', 'triste', 'dientes'].map((k) => [k, drawMouth(c, k)])), 0.17, 0.1);
    this.mouth.position.set(0, 0.34, 0.012); head.add(this.mouth);

    // sombra suave en el piso
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.y = 0.45;
    g.add(blob);
  }

  // st: { accion, t (seg desde inicio de la acción), dur, habla (bool), cara, mira (+1/-1), tGlobal }
  update(st) {
    const { t, tg } = st;
    const a = st.accion || 'quieto';
    const sd = this.seed * 10;
    let armL = 0.08, armR = -0.08, legL = 0, legR = 0, lean = 0, bob = 0, headTilt = 0, headY = 0, jump = 0, sx = 0;
    let eyes = 'normal', mouth = 'cerrada';
    const breathe = Math.sin(tg * 2.2 + sd) * 0.012;
    headTilt = Math.sin(tg * 1.3 + sd) * 0.04;

    switch (a) {
      case 'caminar': case 'correr': {
        const fast = a === 'correr';
        const f = fast ? 11 : 7.5, amp = fast ? 0.75 : 0.45;
        const ph = tg * f + sd;
        legL = Math.sin(ph) * amp; legR = -legL;
        armL = -Math.sin(ph) * amp * 0.9; armR = -armL;
        bob = Math.abs(Math.cos(ph)) * (fast ? 0.07 : 0.04);
        lean = fast ? -0.16 : -0.04;
        if (fast) mouth = 'media';
        break;
      }
      case 'cavar': {
        const ph = (tg * 2.4 + sd) % 1; // ciclo de golpe
        const k = ph < 0.55 ? ph / 0.55 : 1 - (ph - 0.55) / 0.45;
        const swing = lerp(-0.3, 2.6, easeOut(k)); // brazos de abajo a arriba
        armR = swing; armL = swing - 0.15;
        lean = lerp(-0.25, 0.05, k);
        bob = -0.02 * (1 - k);
        mouth = k > 0.8 ? 'dientes' : 'cerrada';
        break;
      }
      case 'senalar': case 'señalar': {
        const k = easeOutBack(clamp(t / 0.35));
        armR = k * 1.55 + Math.sin(tg * 3) * 0.04; armL = 0.05;
        mouth = 'media'; eyes = 'normal';
        break;
      }
      case 'sorpresa': {
        const k = clamp(t / 0.25);
        jump = Math.sin(clamp(t / 0.45) * Math.PI) * 0.35;
        armL = -easeOutBack(k) * 2.4; armR = easeOutBack(k) * 2.4;
        armL += Math.sin(tg * 18) * 0.06; armR += Math.sin(tg * 18) * 0.06;
        eyes = 'abiertos'; mouth = 'o'; lean = 0.05;
        break;
      }
      case 'asustado': {
        sx = Math.sin(tg * 45) * 0.025;
        armL = -1.9; armR = 1.9; eyes = 'abiertos'; mouth = 'dientes'; lean = 0.12;
        break;
      }
      case 'celebrar': {
        const ph = tg * 7 + sd;
        jump = Math.abs(Math.sin(ph * 0.5)) * 0.22;
        armL = -2.7 + Math.sin(ph) * 0.3; armR = 2.7 - Math.sin(ph) * 0.3;
        eyes = 'feliz'; mouth = 'sonrisa';
        break;
      }
      case 'saludar': {
        armR = 2.6 + Math.sin(tg * 9) * 0.35; mouth = 'sonrisa'; eyes = 'feliz';
        break;
      }
      case 'pensar': {
        armR = 2.6; armL = 0.5; headTilt = 0.12; eyes = 'preocupado'; mouth = 'cerrada';
        break;
      }
      case 'empujar': {
        armL = armR = 1.45; lean = -0.22; legL = 0.35; legR = -0.35; mouth = 'dientes'; eyes = 'enojado';
        bob = Math.sin(tg * 10) * 0.01;
        break;
      }
      case 'cargar': {
        armL = armR = 1.2; lean = 0.06; mouth = 'dientes';
        break;
      }
      case 'dormir': {
        eyes = 'cerrados'; headTilt = 0.25; armL = 0.05; armR = -0.05; bob = Math.sin(tg * 1.5) * 0.01;
        break;
      }
      case 'triste': {
        eyes = 'preocupado'; mouth = 'triste'; headTilt = 0.15; armL = 0.02; armR = -0.02;
        break;
      }
      case 'enojado': {
        eyes = 'enojado'; mouth = 'dientes'; armL = -0.5; armR = 0.5; sx = Math.sin(tg * 30) * 0.008;
        break;
      }
      case 'hablar': {
        armR = 0.4 + Math.sin(tg * 2.7 + sd) * 0.35; armL = -0.2 + Math.sin(tg * 2.1 + sd) * 0.15;
        break;
      }
      default: { // quieto
        armL = 0.08 + Math.sin(tg * 1.7 + sd) * 0.04; armR = -armL;
      }
    }

    // cara forzada desde el guion de escenas
    const FACES = { feliz: ['feliz', 'sonrisa'], sorpresa: ['abiertos', 'o'], asustado: ['abiertos', 'dientes'], enojado: ['enojado', 'dientes'], triste: ['preocupado', 'triste'], normal: ['normal', 'cerrada'], pensativo: ['preocupado', 'cerrada'], dormido: ['cerrados', 'cerrada'] };
    if (st.cara && FACES[st.cara]) [eyes, mouth] = FACES[st.cara];
    // boca hablando (sincronizada con la narración)
    if (st.habla && st.hablando) {
      const v = Math.sin(tg * 23 + sd) + Math.sin(tg * 13.7);
      mouth = v > 0.6 ? 'abierta' : v > -0.4 ? 'media' : 'cerrada';
    }
    // parpadeo
    const blinkPh = (tg + sd * 3) % 3.4;
    if (blinkPh < 0.12 && eyes !== 'cerrados' && eyes !== 'feliz') eyes = 'cerrados';

    this.legL.rotation.z = legL; this.legR.rotation.z = legR;
    this.armL.rotation.z = armL; this.armR.rotation.z = armR;
    this.body.rotation.z = lean;
    this.body.position.set(sx, bob + jump, 0);
    this.torso.scale.y = 1 + breathe;
    this.head.rotation.z = headTilt; this.head.position.y = 1.36 + breathe * 0.7 + headY;
    this.eyes.userData.set(eyes); this.mouth.userData.set(mouth);
  }
}

// ---------- Animales (planos de perfil) ----------
const ANIMAL_DRAW = {
  gato: (col) => (g, W, H) => {
    // cuerpo
    g.beginPath(); g.ellipse(W * 0.45, H * 0.62, W * 0.3, H * 0.2, 0, 0, 7); stroke(g, col);
    for (const x of [0.25, 0.38, 0.55, 0.66]) { g.beginPath(); roundRect(g, W * x, H * 0.68, W * 0.07, H * 0.3, 10); stroke(g, col); }
    // cabeza
    g.beginPath(); g.arc(W * 0.78, H * 0.42, H * 0.2, 0, 7); stroke(g, col);
    for (const dx of [-0.07, 0.07]) { g.beginPath(); g.moveTo(W * (0.78 + dx) - 20, H * 0.3); g.lineTo(W * (0.78 + dx), H * 0.12); g.lineTo(W * (0.78 + dx) + 20, H * 0.3); g.closePath(); stroke(g, col); }
    g.fillStyle = '#9be15d'; g.beginPath(); g.ellipse(W * 0.84, H * 0.4, 12, 16, 0, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.ellipse(W * 0.845, H * 0.4, 4, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#e88'; g.beginPath(); g.arc(W * 0.93, H * 0.47, 7, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); for (const dy of [-6, 4]) { g.moveTo(W * 0.92, H * 0.5 + dy); g.lineTo(W * 1.0, H * 0.48 + dy * 2); } g.stroke();
  },
  perro: (col) => (g, W, H) => {
    g.beginPath(); g.ellipse(W * 0.45, H * 0.6, W * 0.3, H * 0.2, 0, 0, 7); stroke(g, col);
    for (const x of [0.24, 0.37, 0.55, 0.66]) { g.beginPath(); roundRect(g, W * x, H * 0.66, W * 0.08, H * 0.32, 10); stroke(g, col); }
    g.beginPath(); g.ellipse(W * 0.8, H * 0.38, H * 0.22, H * 0.19, 0, 0, 7); stroke(g, col);
    g.beginPath(); g.ellipse(W * 0.92, H * 0.45, H * 0.12, H * 0.08, 0, 0, 7); stroke(g, col);
    g.beginPath(); g.ellipse(W * 0.72, H * 0.4, H * 0.07, H * 0.17, 0.3, 0, 7); stroke(g, shade(col, -0.3));
    g.fillStyle = INK; g.beginPath(); g.arc(W * 0.84, H * 0.33, 8, 0, 7); g.arc(W * 0.99, H * 0.43, 9, 0, 7); g.fill();
  },
  rata: (col) => (g, W, H) => {
    g.beginPath(); g.ellipse(W * 0.45, H * 0.68, W * 0.28, H * 0.2, 0, 0, 7); stroke(g, col);
    g.beginPath(); g.moveTo(W * 0.65, H * 0.55); g.lineTo(W * 0.98, H * 0.72); g.lineTo(W * 0.65, H * 0.85); g.closePath(); stroke(g, col);
    g.beginPath(); g.arc(W * 0.66, H * 0.48, H * 0.1, 0, 7); stroke(g, '#e8a0a0');
    g.fillStyle = INK; g.beginPath(); g.arc(W * 0.8, H * 0.64, 6, 0, 7); g.fill(); g.fillStyle = '#e88'; g.beginPath(); g.arc(W * 0.98, H * 0.72, 6, 0, 7); g.fill();
  },
  gallina: (col) => (g, W, H) => {
    g.beginPath(); g.ellipse(W * 0.45, H * 0.55, W * 0.28, H * 0.25, 0, 0, 7); stroke(g, col);
    g.beginPath(); g.arc(W * 0.7, H * 0.3, H * 0.14, 0, 7); stroke(g, col);
    g.beginPath(); g.moveTo(W * 0.8, H * 0.28); g.lineTo(W * 0.92, H * 0.32); g.lineTo(W * 0.8, H * 0.36); stroke(g, '#f2a531', 5);
    g.beginPath(); g.arc(W * 0.7, H * 0.15, 12, 0, 7); stroke(g, '#d62828', 5);
    g.strokeStyle = '#f2a531'; g.lineWidth = 8; g.beginPath(); g.moveTo(W * 0.4, H * 0.78); g.lineTo(W * 0.4, H * 0.98); g.moveTo(W * 0.52, H * 0.78); g.lineTo(W * 0.52, H * 0.98); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(W * 0.74, H * 0.27, 6, 0, 7); g.fill();
  },
  loro: (col) => (g, W, H) => {
    g.beginPath(); g.ellipse(W * 0.45, H * 0.55, W * 0.2, H * 0.3, 0.4, 0, 7); stroke(g, col);
    g.beginPath(); g.arc(W * 0.62, H * 0.25, H * 0.15, 0, 7); stroke(g, col);
    g.beginPath(); g.moveTo(W * 0.72, H * 0.2); g.quadraticCurveTo(W * 0.9, H * 0.25, W * 0.74, H * 0.36); stroke(g, '#f2c230', 5);
    g.fillStyle = INK; g.beginPath(); g.arc(W * 0.66, H * 0.22, 6, 0, 7); g.fill();
  },
  caballo: (col) => (g, W, H) => {
    g.beginPath(); g.ellipse(W * 0.45, H * 0.5, W * 0.3, H * 0.17, 0, 0, 7); stroke(g, col);
    for (const x of [0.2, 0.32, 0.56, 0.67]) { g.beginPath(); roundRect(g, W * x, H * 0.55, W * 0.06, H * 0.43, 8); stroke(g, col); }
    g.beginPath(); g.moveTo(W * 0.68, H * 0.45); g.lineTo(W * 0.8, H * 0.12); g.lineTo(W * 0.98, H * 0.22); g.lineTo(W * 0.85, H * 0.48); g.closePath(); stroke(g, col);
    g.fillStyle = INK; g.beginPath(); g.arc(W * 0.86, H * 0.19, 6, 0, 7); g.fill();
  },
};
const ANIMAL_SIZE = { gato: [0.9, 0.6], perro: [1.1, 0.8], rata: [0.5, 0.28], gallina: [0.6, 0.6], loro: [0.45, 0.6], caballo: [2.4, 2.1] };
const ANIMAL_COLOR = { gato: '#f2a03d', perro: '#c58b4c', rata: '#8d8d8d', gallina: '#fafafa', loro: '#3fa34d', caballo: '#8b5a2b' };

class Animal {
  constructor(cfg) {
    this.c = cfg; this.seed = hash(cfg.id || cfg.tipo);
    const [w, h] = ANIMAL_SIZE[cfg.tipo];
    this.focusY = h * 0.6;
    const s = cfg.escala || 1;
    this.group = new THREE.Group(); this.group.scale.setScalar(s);
    this.body = part(w, h, ANIMAL_DRAW[cfg.tipo](cfg.color || ANIMAL_COLOR[cfg.tipo]), w / 2, 0);
    this.group.add(this.body);
    if (cfg.tipo === 'gato' || cfg.tipo === 'rata' || cfg.tipo === 'perro') {
      const col = cfg.color || ANIMAL_COLOR[cfg.tipo];
      this.tail = part(0.1, h * 0.5, (g, W, H) => { g.beginPath(); roundRect(g, W * 0.25, 4, W * 0.5, H - 8, 20); stroke(g, cfg.tipo === 'rata' ? '#e8a0a0' : col, 6); }, 0.06, 0);
      this.tail.position.set(-w * 0.28, h * 0.62, -0.01); this.group.add(this.tail);
    }
    const blob = new THREE.Mesh(new THREE.CircleGeometry(w * 0.45, 32), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.2, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.y = 0.35; this.group.add(blob);
  }
  update(st) {
    const { tg } = st; const a = st.accion || 'quieto'; const sd = this.seed * 10;
    const moving = a === 'caminar' || a === 'correr';
    const f = a === 'correr' ? 16 : 9;
    this.body.position.y = moving ? Math.abs(Math.sin(tg * f + sd)) * 0.06 : a === 'sorpresa' ? Math.sin(clamp(st.t / 0.4) * Math.PI) * 0.3 : 0;
    this.body.rotation.z = moving ? Math.sin(tg * f + sd) * 0.04 : Math.sin(tg * 1.5 + sd) * 0.015;
    this.body.scale.y = 1 + Math.sin(tg * 2.5 + sd) * 0.015;
    if (this.tail) this.tail.rotation.z = 0.45 + Math.sin(tg * (moving ? 10 : 3) + sd) * 0.3;
  }
}

export function createCharacter(cfg) {
  return ANIMALS.has(cfg.tipo) ? new Animal(cfg) : new Human(cfg);
}
export const CHARACTER_TYPES = [...Object.keys(PRESETS), ...ANIMALS];
export const ITEM_TYPES = Object.keys(ITEMS);
