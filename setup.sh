#!/usr/bin/env bash
# Instala todo lo necesario para generar los shorts animados.
# Uso: bash setup.sh   (idempotente: se puede correr varias veces)
set -euo pipefail
cd "$(dirname "$0")"

# 1) Paquetes del sistema: ffmpeg (video), espeak-ng (fonemas para la voz), sox (audio), fuentes
if command -v apt-get >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ffmpeg espeak-ng sox imagemagick fonts-noto-color-emoji fonts-dejavu fonts-liberation
fi

# 2) Python: voz neuronal Kokoro (español e inglés)
pip3 install -q -r requirements.txt

# 3) Node: three.js (escenarios 3D) + fuentes para subtítulos
npm install --no-audit --no-fund

# 4) Modelo de voz Kokoro (~350 MB, se descarga de GitHub)
mkdir -p models
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "models/$f" ] || curl -sSLf -o "models/$f" "$base/$f"
done

# 5) Navegador para renderizar: usa Playwright + Chromium si ya están; si no, los instala
node -e "require('playwright')" 2>/dev/null || { npm install --no-save playwright && npx playwright install --with-deps chromium; }

echo "Listo. Prueba: node tools/smoke-test.mjs output/smoke"
