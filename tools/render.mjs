// Renderiza un proyecto de video.
//
// Uso:
//   node tools/render.mjs proyectos/<nombre> [--preview] [--fotos] [--desde 10 --hasta 20]
//
// La carpeta del proyecto contiene:
//   voz.(mp3|wav|m4a)  la voz en off (se genera aparte)
//   guion.txt          el texto del guion (opcional, mejora los subtítulos)
//   escenas.json       el storyboard: sets, personajes, acciones y cámara por escena
// Resultado: output/<nombre>/video.mp4   (--fotos: una imagen por escena para revisar)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const projDir = path.resolve(args.find((a) => !a.startsWith('--') && !/^\d/.test(a)) || '');
if (!fs.existsSync(path.join(projDir, 'escenas.json'))) { console.error('No encuentro escenas.json en', projDir); process.exit(1); }
const name = path.basename(projDir);
const outDir = path.join(ROOT, 'output', name);
fs.mkdirSync(outDir, { recursive: true });

const preview = flag('--preview');
const W = preview ? 540 : 1080, H = preview ? 960 : 1920;
const story = JSON.parse(fs.readFileSync(path.join(projDir, 'escenas.json'), 'utf8'));
const FPS = preview ? 15 : story.fps || 30;

// ---------- 1) Voz y tiempos por palabra ----------
const voice = ['voz.mp3', 'voz.wav', 'voz.m4a', 'voz.ogg', 'voz.flac'].map((f) => path.join(projDir, f)).find(fs.existsSync);
if (!voice) { console.error('Falta la voz: pon voz.mp3 (o .wav/.m4a) en', projDir); process.exit(1); }
const wordsFile = path.join(projDir, 'palabras.json');
const script = path.join(projDir, 'guion.txt');
const stale = (f, ...deps) => !fs.existsSync(f) || deps.filter(fs.existsSync).some((d) => fs.statSync(d).mtimeMs > fs.statSync(f).mtimeMs);
if (stale(wordsFile, voice, script)) {
  console.log('Transcribiendo la voz para sincronizar subtítulos...');
  execFileSync('python3', [path.join(ROOT, 'tools/transcribe.py'), voice, wordsFile, ...(fs.existsSync(script) ? [script] : [])], { stdio: 'inherit' });
}
const { words, duration: voiceDur } = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
const duration = voiceDur + (story.cola ?? 0.6);

// ---------- 2) Convertir frases del guion en segundos ----------
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(Boolean);
const wn = words.map((w) => norm(w.w).join(''));
function findPhrase(phrase, afterTime = 0) {
  if (typeof phrase === 'number') return phrase;
  const target = norm(phrase);
  for (let i = 0; i < wn.length; i++) {
    if (words[i].start < afterTime - 0.01) continue;
    let ok = true;
    for (let k = 0; k < target.length; k++) if (wn[i + k] !== target[k]) { ok = false; break; }
    if (ok) return words[i].start;
  }
  throw new Error(`No encontré la frase "${phrase}" en la voz (después de ${afterTime.toFixed(1)}s). Texto reconocido:\n${words.map((w) => w.w).join(' ')}`);
}

const scenes = [];
let prev = 0;
story.escenas.forEach((e, i) => {
  const start = i === 0 ? 0 : e.inicio ?? findPhrase(e.desde, prev);
  scenes.push({ ...e, index: i, start: Math.max(start - (story.adelanto ?? 0.08), 0) });
  prev = start;
});
scenes.forEach((s, i) => { s.end = i + 1 < scenes.length ? scenes[i + 1].start : duration; });
for (const s of scenes) {
  const t = (v, base = s.start) => (v === undefined ? undefined : typeof v === 'number' ? base + v : findPhrase(v, s.start - 0.01));
  for (const p of s.personajes || []) {
    if (p.acciones) p.acciones = p.acciones.map((a) => ({ ...a, start: a.desde !== undefined ? t(a.desde) : a.en !== undefined ? s.start + a.en : s.start }));
  }
  if (s.rotulo) {
    if (typeof s.rotulo === 'string') s.rotulo = { texto: s.rotulo };
    const rs = s.rotulo.desde !== undefined ? t(s.rotulo.desde) : s.start + 0.15;
    s.rotulo = { ...s.rotulo, start: rs, end: Math.min(s.end, rs + (s.rotulo.duracion ?? 2.2)) };
  }
}
console.log(`Escenas: ${scenes.length} | duración ${duration.toFixed(1)}s | ${W}x${H} @${FPS}fps`);
scenes.forEach((s) => console.log(`  ${String(s.index + 1).padStart(2)}  ${s.start.toFixed(2).padStart(6)}-${s.end.toFixed(2).padStart(6)}s  ${s.set}`));

// ---------- 3) Servidor local + Chromium ----------
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver')) console.log('[página]', m.text()); });
page.on('pageerror', (e) => { console.error('[página] error:', e.message); });
await page.goto(`http://localhost:${port}/engine/index.html`);
await page.waitForFunction('window.engineReady');
await page.evaluate((d) => window.setup(d), { width: W, height: H, fps: FPS, duration, words, subtitulos: story.subtitulos, scenes });

const shot = () => page.screenshot({ type: 'jpeg', quality: 92 });

try {
  // ---------- 4a) Fotos de revisión: un frame por escena ----------
  if (flag('--fotos')) {
    const dir = path.join(outDir, 'fotos');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of scenes) {
      const t = s.start + (s.end - s.start) * 0.6;
      await page.evaluate((t) => window.renderFrame(t), t);
      fs.writeFileSync(path.join(dir, `escena_${String(s.index + 1).padStart(2, '0')}.jpg`), await shot());
    }
    console.log('Fotos ->', dir);
  } else {
    // ---------- 4b) Video ----------
    const t0 = Number(opt('--desde', 0)), t1 = Math.min(Number(opt('--hasta', duration)), duration);
    const out = path.join(outDir, preview ? 'preview.mp4' : 'video.mp4');
    const music = story.musica && path.resolve(projDir, story.musica.archivo);
    const ff = ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-ss', String(t0), '-t', String(t1 - t0), '-i', voice];
    let filter = [];
    if (music && fs.existsSync(music)) {
      ff.push('-stream_loop', '-1', '-i', music);
      filter = ['-filter_complex', `[2:a]volume=${story.musica.volumen ?? 0.12},atrim=0:${t1 - t0}[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]`, '-map', '0:v', '-map', '[a]'];
    } else filter = ['-map', '0:v', '-map', '1:a'];
    ff.push(...filter, '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'medium', '-crf', preview ? '26' : '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-t', String(t1 - t0), '-movflags', '+faststart', out);
    const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((t1 - t0) * FPS);
    const started = Date.now();
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => window.renderFrame(t), t0 + i / FPS);
      const buf = await shot();
      if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
      if (i % (FPS * 5) === 0) {
        const el = (Date.now() - started) / 1000;
        process.stdout.write(`\r  frame ${i}/${n}  (${((i / n) * 100).toFixed(0)}%)  ${el.toFixed(0)}s   `);
      }
    }
    enc.stdin.end();
    await new Promise((r, j) => enc.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg falló: ' + c)))));
    console.log(`\nVideo -> ${out}  (${((Date.now() - started) / 1000).toFixed(0)}s de render)`);
  }
} finally {
  await browser.close();
  server.close();
}
