# Para-videos-animados

Generador de shorts animados verticales (9:16) de historias reales y curiosas:
personajes 2D planos sobre escenarios 3D, voz en off y subtítulos grandes.

## Instalación

```bash
bash setup.sh
```

Instala:

| Herramienta | Para qué |
|---|---|
| ffmpeg | Une los frames y el audio en MP4 1080x1920 |
| Parakeet TDT v3 (`sherpa-onnx`) | Saca el tiempo de cada palabra de tu voz en off para sincronizar subtítulos (español, inglés y más) |
| Kokoro TTS (`kokoro-onnx`) + espeak-ng | Voz de respaldo para pruebas (las voces finales se generan aparte). Español: `em_alex`, `em_santa`, `ef_dora`. Inglés: `am_michael`, `af_heart`, etc. |
| three.js | Escenarios 3D iluminados |
| Playwright + Chromium | Renderiza la escena frame a frame (headless) |
| Fuentes Luckiest Guy / Bangers / Montserrat | Subtítulos estilo caricatura |

## Hacer un video

1. Crea `proyectos/<nombre>/` con `voz.mp3` (tu voz en off) y `guion.txt`.
2. Escribe `escenas.json` (formato en [docs/ESCENAS.md](docs/ESCENAS.md); ejemplo en `proyectos/gatos-de-barco/`).
3. Revisa y renderiza:

```bash
node tools/render.mjs proyectos/<nombre> --fotos     # una imagen por escena
node tools/render.mjs proyectos/<nombre> --preview   # video rápido
node tools/render.mjs proyectos/<nombre>             # final → output/<nombre>/video.mp4
```

Para probar sin voz real: `python3 tools/voz_prueba.py proyectos/<nombre>` genera `voz.wav` con Kokoro.

## Prueba rápida

```bash
node tools/smoke-test.mjs output/smoke [audio.wav]
```

Genera `output/smoke/smoke.mp4`, una escena 3D de prueba con subtítulo.

## Subtítulos sincronizados con tu voz

```bash
python3 tools/transcribe.py voz.mp3 palabras.json [guion.txt]
```

Con `guion.txt` los subtítulos usan el texto exacto del guion y los tiempos del audio.
