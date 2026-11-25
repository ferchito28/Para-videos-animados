// Prueba de humo: renderiza una escena 3D con three.js en Chromium headless,
// captura frames y los une con ffmpeg + voz en un MP4 vertical 1080x1920.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright preinstalado globalmente

const root = path.resolve('.');
const out = process.argv[2] || 'output/smoke';
const audio = process.argv[3];
fs.mkdirSync(out, { recursive: true });

const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:LG;src:url(/node_modules/@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff2)}
body{margin:0}#cap{position:absolute;bottom:420px;width:100%;text-align:center;font:110px LG;color:#fff;
-webkit-text-stroke:10px #000;paint-order:stroke fill}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script></head>
<body><div id="cap">¡PRUEBA!</div><script type="module">
import * as THREE from 'three';
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1080,1920);
r.shadowMap.enabled=true;document.body.prepend(r.domElement);
const s=new THREE.Scene();s.background=new THREE.Color('#f4c38a');
const c=new THREE.PerspectiveCamera(40,1080/1920,0.1,100);c.position.set(0,3,12);c.lookAt(0,1.5,0);
s.add(new THREE.HemisphereLight('#fff','#a86',1.2));const d=new THREE.DirectionalLight('#fff',2);d.position.set(4,8,5);d.castShadow=true;s.add(d);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#8b5a3c'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;s.add(floor);
const box=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial({color:'#3a6ea5'}));box.position.y=1;box.castShadow=true;s.add(box);
window.renderFrame=(t)=>{box.rotation.y=t*1.5;c.position.x=Math.sin(t*.5)*2;c.lookAt(0,1.5,0);r.render(s,c);};
window.ready=true;
</script></body></html>`;
fs.writeFileSync(path.join(root, out, 'scene.html'), html);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://localhost:${port}/${out}/scene.html`);
await page.waitForFunction('window.ready');
await page.evaluate('document.fonts.ready');
const fps = 30, secs = 3;
for (let i = 0; i < fps * secs; i++) {
  await page.evaluate(`renderFrame(${i / fps})`);
  await page.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
}
await browser.close(); server.close();
const args = ['-y', '-framerate', String(fps), '-i', `${out}/f%05d.jpg`];
if (audio) args.push('-i', audio, '-shortest');
args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', `${out}/smoke.mp4`);
execFileSync('ffmpeg', args, { stdio: 'ignore' });
console.log('OK ->', `${out}/smoke.mp4`);
