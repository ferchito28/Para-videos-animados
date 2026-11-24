// Utilidades compartidas del motor.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeOutBack = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// Hash de texto -> número estable (para variar parpadeos, etc. sin aleatoriedad real)
export function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

// Generador pseudoaleatorio determinista (mismo video en cada render)
export function rng(seed) {
  let s = Math.floor(hash(seed) * 2 ** 31) || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// Crea una textura a partir de un dibujo en canvas 2D.
export function canvasTexture(w, h, draw, { repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  return tex;
}

export function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Oscurece/aclara un color hex. k<0 oscurece, k>0 aclara.
export function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k < 0) c.multiplyScalar(1 + k); else c.lerp(new THREE.Color('#ffffff'), k);
  return '#' + c.getHexString();
}

// Material "caricatura" con 3 tonos de luz (look estilizado en los sets 3D).
let gradient;
export function toon(color, opts = {}) {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 180, 180, 180, 255, 255, 255, 255, 255]), 3, 1);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts });
}

// Malla con sombras activadas.
export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

export const box = (w, h, d, color, o = {}) => mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? toon(color) : color, { y: h / 2, ...o });
export const cyl = (rt, rb, h, color, o = {}, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? toon(color) : color, { y: h / 2, ...o });
export const sphere = (r, color, o = {}) => mesh(new THREE.SphereGeometry(r, 24, 16), typeof color === 'string' ? toon(color) : color, { y: r, ...o });

// Texto en canvas (para carteles dentro del mundo 3D)
export function textTexture(text, { w = 1024, h = 256, bg = '#f5e6c8', fg = '#2b1d0e', font = 'LG', border = '#2b1d0e' } = {}) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg; roundRect(g, 8, 8, w - 16, h - 16, 30); g.fill();
    g.lineWidth = 14; g.strokeStyle = border; g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = h * 0.55;
    g.font = `${size}px ${font}`;
    while (g.measureText(text).width > w * 0.86 && size > 10) { size -= 4; g.font = `${size}px ${font}`; }
    g.fillText(text, w / 2, h / 2 + size * 0.06);
  });
}
