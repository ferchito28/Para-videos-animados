"""Genera una voz de PRUEBA con Kokoro (solo para probar; las voces finales se hacen aparte).

Uso: python3 tools/voz_prueba.py proyectos/<nombre> [voz] [velocidad]
Lee guion.txt y escribe voz.wav. Voces: em_alex, em_santa, ef_dora (español); am_michael, af_heart... (inglés).
"""
import re, sys
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
proj = Path(sys.argv[1]); voice = sys.argv[2] if len(sys.argv) > 2 else "em_alex"
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.1
lang = "es" if voice[0] == "e" else "en-us" if voice[0] == "a" else "en-gb"
k = Kokoro(str(ROOT / "models/kokoro-v1.0.onnx"), str(ROOT / "models/voices-v1.0.bin"))
text = (proj / "guion.txt").read_text(encoding="utf-8")
parts, sr = [], 24000
for para in [p.strip() for p in text.split("\n") if p.strip()]:
    for sent in re.split(r"(?<=[.!?…])\s+", para):
        a, sr = k.create(sent, voice=voice, speed=speed, lang=lang)
        parts += [a, np.zeros(int(sr * 0.12), dtype=np.float32)]
    parts.append(np.zeros(int(sr * 0.15), dtype=np.float32))
sf.write(proj / "voz.wav", np.concatenate(parts), sr)
print("voz de prueba ->", proj / "voz.wav")
