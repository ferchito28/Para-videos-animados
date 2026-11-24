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
