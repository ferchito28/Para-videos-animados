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
| Kokoro TTS (`kokoro-onnx`) + espeak-ng | Voz neuronal. Español: `em_alex`, `em_santa`, `ef_dora`. Inglés: `am_michael`, `af_heart`, etc. |
| three.js | Escenarios 3D iluminados |
| Playwright + Chromium | Renderiza la escena frame a frame (headless) |
| Fuentes Luckiest Guy / Bangers / Montserrat | Subtítulos estilo caricatura |

## Prueba rápida

```bash
node tools/smoke-test.mjs output/smoke [audio.wav]
```

Genera `output/smoke/smoke.mp4`, una escena 3D de prueba con subtítulo.
