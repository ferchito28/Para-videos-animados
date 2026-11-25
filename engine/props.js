// Objetos 3D (props) con estilo caricatura.
import * as THREE from 'three';
import { toon, box, cyl, sphere, mesh, textTexture, shade } from './util.js';

const G = () => new THREE.Group();

const PROPS = {
  caja: ({ color = '#c08a4a' }) => { const g = G(); g.add(box(0.8, 0.8, 0.8, color)); g.add(box(0.82, 0.1, 0.82, shade(color, -0.3), { y: 0.35 })); return g; },
  barril: ({ color = '#8b5a2b' }) => { const g = G(); g.add(cyl(0.38, 0.38, 1, color, {}, 20)); for (const y of [0.15, 0.82]) g.add(cyl(0.4, 0.4, 0.07, '#3d3d3d', { y }, 20)); return g; },
  jarron: ({ color = '#c0583a' }) => {
    const pts = [[0, 0], [0.25, 0], [0.38, 0.25], [0.42, 0.55], [0.3, 0.85], [0.17, 1.0], [0.2, 1.12], [0.16, 1.15]].map(([x, y]) => new THREE.Vector2(x, y));
    const g = G(); g.add(mesh(new THREE.LatheGeometry(pts, 28), toon(color, { side: THREE.DoubleSide })));
    g.add(mesh(new THREE.TorusGeometry(0.4, 0.025, 6, 28), toon('#2b1d0e'), { y: 0.55, rx: Math.PI / 2 }));
    return g;
  },
  monedas: ({ color = '#f2c230', n = 6 }) => { const g = G(); for (let i = 0; i < n; i++) g.add(cyl(0.16, 0.16, 0.05, toon(color, { emissive: '#7a5a00', emissiveIntensity: 0.3 }), { x: (i % 3) * 0.25 - 0.25, y: Math.floor(i / 3) * 0.05, z: (i % 2) * 0.1 }, 20)); return g; },
  lingotes: ({ n = 6 }) => { const g = G(); for (let i = 0; i < n; i++) g.add(box(0.5, 0.18, 0.25, toon('#f2c230', { emissive: '#7a5a00', emissiveIntensity: 0.3 }), { x: (i % 3) * 0.52 - 0.52, y: Math.floor(i / 3) * 0.18 })); return g; },
  cofre: ({ color = '#8b5a2b' }) => { const g = G(); g.add(box(1, 0.6, 0.65, color)); g.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 1, 20, 1, false, 0, Math.PI), toon(shade(color, 0.1)), { y: 0.6, rz: Math.PI / 2 })); g.add(box(1.02, 0.08, 0.67, '#c9a227', { y: 0.55 })); g.add(box(0.15, 0.2, 0.05, '#c9a227', { y: 0.45, z: 0.33 })); return g; },
  roca: ({ color = '#8d8d8d' }) => { const g = G(); g.add(mesh(new THREE.DodecahedronGeometry(0.5, 0), toon(color), { y: 0.35, s: [1.2, 0.8, 1] })); return g; },
  mesa: ({ color = '#8b5a3c' }) => { const g = G(); g.add(box(1.6, 0.1, 0.9, color, { y: 0.9 })); for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) g.add(box(0.1, 0.9, 0.1, shade(color, -0.2), { x, z })); return g; },
  silla: ({ color = '#8b5a3c' }) => { const g = G(); g.add(box(0.6, 0.08, 0.6, color, { y: 0.5 })); g.add(box(0.6, 0.7, 0.08, color, { y: 0.55, z: -0.26 })); for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(box(0.07, 0.5, 0.07, shade(color, -0.2), { x, z })); return g; },
  cartel: ({ texto = '¡AQUÍ!', color = '#f5e6c8' }) => {
    const g = G(); g.add(cyl(0.05, 0.05, 1.4, '#6b4423', {}, 8));
    const t = textTexture(texto, { bg: color });
    g.add(mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: t, transparent: true }), { y: 1.4, z: 0.06, cast: false }));
    return g;
  },
  letrero: ({ texto = 'BANCO', color = '#1f2f55', fg = '#f2c230' }) => {
    const g = G(); const t = textTexture(texto, { bg: color, fg, border: fg });
    g.add(mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: t, transparent: true }), { cast: false }));
    return g;
  },
  canon: ({ color = '#2b2b2b' }) => {
    const g = G(); g.add(mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.6, 20), toon(color), { y: 0.55, z: 0.1, rx: Math.PI / 2 - 0.25 }));
    for (const x of [-0.3, 0.3]) g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), toon('#6b4423'), { x, y: 0.3, rz: Math.PI / 2 }));
    g.add(box(0.5, 0.25, 0.9, '#6b4423', { y: 0.2 }));
    return g;
  },
  bala: ({ color = '#2b2b2b' }) => { const g = G(); g.add(sphere(0.15, color)); return g; },
  ancla: ({ color = '#4a4f55' }) => { const g = G(); g.add(cyl(0.06, 0.06, 1.2, color, { y: 0.2 }, 10)); g.add(mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 20, Math.PI), toon(color), { y: 0.4, rz: Math.PI })); g.add(mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), toon(color), { y: 1.55 })); g.add(box(0.6, 0.08, 0.08, color, { y: 1.25 })); return g; },
  botella: ({ color = '#2e7d32' }) => { const g = G(); g.add(cyl(0.12, 0.12, 0.4, toon(color, { transparent: true, opacity: 0.85 }))); g.add(cyl(0.04, 0.08, 0.18, toon(color), { y: 0.4 })); return g; },
  lampara: ({ color = '#ffd166' }) => { const g = G(); g.add(cyl(0.15, 0.2, 0.08, '#3b2a1e')); g.add(cyl(0.12, 0.12, 0.35, toon(color, { emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 }), { y: 0.08 })); g.add(cyl(0.16, 0.1, 0.08, '#3b2a1e', { y: 0.43 })); const l = new THREE.PointLight(color, 4, 5); l.position.y = 0.3; g.add(l); return g; },
  reloj: ({ color = '#c9a227' }) => {
    const g = G(); g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 32), toon(color), { y: 0.5, rx: Math.PI / 2 }));
    g.add(mesh(new THREE.CircleGeometry(0.42, 32), toon('#fbf6e9'), { y: 0.5, z: 0.065 }));
    const h = box(0.04, 0.25, 0.02, '#222', { y: 0, z: 0.08 }); const m = box(0.03, 0.36, 0.02, '#222', { y: 0, z: 0.09 });
    const hg = G(); hg.position.y = 0.5; hg.add(h); const mg = G(); mg.position.y = 0.5; mg.add(m); g.add(hg, mg);
    g.userData.update = (t) => { mg.rotation.z = -t * 2; hg.rotation.z = -t * 0.17; };
    return g;
  },
  globo: ({ color = '#3a86c8' }) => { const g = G(); g.add(cyl(0.2, 0.25, 0.1, '#6b4423')); g.add(cyl(0.03, 0.03, 0.3, '#6b4423', { y: 0.1 })); const s = sphere(0.35, color, { y: 0.4 }); g.add(s); g.userData.update = (t) => { s.rotation.y = t; }; return g; },
  libros: ({ n = 4 }) => { const g = G(); const cols = ['#8e2c2c', '#2c5d8e', '#2e7d32', '#c9a227']; for (let i = 0; i < n; i++) g.add(box(0.7, 0.12, 0.5, cols[i % 4], { y: i * 0.12, ry: (i % 2) * 0.2 })); return g; },
  saco: ({ color = '#c2a36b', texto = '$' }) => { const g = G(); g.add(sphere(0.4, color, { y: -0.05, s: [1, 1.1, 1] })); g.add(cyl(0.12, 0.18, 0.2, color, { y: 0.72 })); const t = textTexture(texto, { bg: color, fg: '#2e7d32', border: color, w: 256, h: 256 }); g.add(mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: t, transparent: true }), { y: 0.38, z: 0.41, cast: false })); return g; },
  arbol: ({ color = '#3f8f3a' }) => { const g = G(); g.add(cyl(0.18, 0.25, 1.4, '#7a4a24')); g.add(mesh(new THREE.ConeGeometry(1.1, 1.8, 10), toon(color), { y: 2.0 })); g.add(mesh(new THREE.ConeGeometry(0.85, 1.5, 10), toon(shade(color, 0.1)), { y: 2.8 })); return g; },
  tren: ({ color = '#b3302d' }) => {
    const g = G(); g.add(box(3.2, 1.2, 1.4, color, { y: 0.5 })); g.add(box(1.2, 1.0, 1.4, shade(color, -0.2), { x: -1.0, y: 1.7 })); g.add(cyl(0.6, 0.6, 2.2, '#2b2b2b', { x: 0.6, y: 1.25, rz: Math.PI / 2 }));
    g.add(cyl(0.2, 0.28, 0.7, '#2b2b2b', { x: 1.3, y: 1.7 })); for (const x of [-1.1, 0, 1.1]) for (const z of [-0.72, 0.72]) g.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 20), toon('#333'), { x, y: 0.38, z, rx: Math.PI / 2 }));
    return g;
  },
  coche: ({ color = '#d62828' }) => {
    const g = G(); g.add(box(2.4, 0.6, 1.2, color, { y: 0.3 })); g.add(box(1.3, 0.55, 1.1, shade(color, 0.1), { x: -0.1, y: 0.9 }));
    g.add(box(1.2, 0.4, 1.12, toon('#bfe3ff'), { x: -0.1, y: 0.95 }));
    for (const x of [-0.8, 0.8]) for (const z of [-0.6, 0.6]) g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20), toon('#222'), { x, y: 0.3, z, rx: Math.PI / 2 }));
    return g;
  },
  barco_mini: ({ color = '#8b5a2b' }) => { const g = G(); g.add(box(1.6, 0.4, 0.6, color, { y: 0.2 })); g.add(cyl(0.04, 0.04, 1.4, '#5a3a1e', { y: 0.4 }, 8)); g.add(mesh(new THREE.PlaneGeometry(0.8, 0.9), toon('#f4efe1', { side: THREE.DoubleSide }), { y: 1.2, z: 0.05 })); return g; },
  fuego: ({ color = '#ff9f1c' }) => {
    const g = G(); for (const [x, z] of [[-0.2, 0], [0.2, 0.05], [0, -0.15]]) g.add(cyl(0.05, 0.05, 0.6, '#6b4423', { x, z, rz: x * 3, y: 0.05 }, 8));
    const flames = [0, 1, 2].map((i) => { const f = mesh(new THREE.ConeGeometry(0.22 - i * 0.05, 0.7 - i * 0.12, 10), toon(['#ff6a00', '#ff9f1c', '#ffd166'][i], { emissive: ['#ff3c00', '#ff7b00', '#ffb700'][i], emissiveIntensity: 1 }), { y: 0.4 + i * 0.05, cast: false }); g.add(f); return f; });
    const l = new THREE.PointLight('#ff8a3c', 8, 6); l.position.y = 0.6; g.add(l);
    g.userData.update = (t) => { flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * (9 + i * 3)) * 0.15; f.rotation.y = t * (2 + i); }); l.intensity = 7 + Math.sin(t * 13) * 1.5; };
    return g;
  },
  hoyo: ({ color = '#1a120b' }) => { const g = G(); g.add(mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ color }), { rx: -Math.PI / 2, y: 0.015, s: [1, 0.6, 1], cast: false })); for (let i = 0; i < 6; i++) g.add(sphere(0.12, '#6b4a2e', { x: Math.cos(i) * 0.8, z: Math.sin(i) * 0.5, y: -0.04 })); return g; },
  montana_rusa: ({ color = '#d62828' }) => {
    const g = G(); const pts = []; for (let i = 0; i <= 60; i++) { const x = -4 + (i / 60) * 8; pts.push(new THREE.Vector3(x, 1.2 + Math.abs(Math.sin(i / 60 * Math.PI * 2.2)) * 2.4, 0)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    g.add(mesh(new THREE.TubeGeometry(curve, 120, 0.08, 8), toon(color)));
    for (let i = 0; i <= 12; i++) { const p = curve.getPointAt(i / 12); g.add(cyl(0.05, 0.05, p.y, '#ffffff', { x: p.x }, 8)); }
    return g;
  },
};

export const PROP_TYPES = Object.keys(PROPS);

export function createProp(cfg) {
  const fn = PROPS[cfg.tipo];
  if (!fn) { console.warn('prop desconocido', cfg.tipo); return G(); }
  const g = fn(cfg);
  const [x, z] = cfg.pos || [0, 0];
  g.position.set(x, cfg.y || 0, z);
  g.rotation.y = cfg.rot || 0;
  g.scale.setScalar(cfg.escala || 1);
  g.userData.base = { y: cfg.y || 0, s: cfg.escala || 1 };
  return g;
}
