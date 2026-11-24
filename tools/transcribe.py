"""Transcribe la voz en off y saca el tiempo de cada palabra (para subtítulos).

Uso: python3 tools/transcribe.py voz.(mp3|wav|m4a) salida.json [guion.txt]
Si se da el guion, los subtítulos usan el texto exacto del guion (ortografía,
números, palabras que el reconocedor omitió) con los tiempos del audio.
Salida: {"duration": s, "text": "...", "words": [{"w": "palabra", "start": s, "end": s}, ...]}
Modelo: Parakeet TDT 0.6B v3 (multilingüe: español, inglés y otros 23 idiomas).
"""
import difflib, json, re, subprocess, sys, unicodedata
from pathlib import Path
import numpy as np
import sherpa_onnx

MODEL = Path(__file__).resolve().parent.parent / "models" / "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"
SR = 16000


def load_audio(path):
    # ffmpeg acepta cualquier formato (mp3 de ElevenLabs, wav, m4a...) y lo pasa a 16 kHz mono
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))


def align_to_script(words, script, dur):
    """Pone las palabras del guion sobre los tiempos reconocidos."""
    sw = script.split()
    a, b = [norm(w["w"]) for w in words], [norm(w) for w in sw]
    times = [None] * len(sw)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(j2 - j1):
                times[j1 + k] = words[i1 + k]["start"]
        elif tag == "replace":  # distinto número de palabras: reparte el tramo
            t0, t1 = words[i1]["start"], words[i2 - 1]["end"]
            for k in range(j2 - j1):
                times[j1 + k] = t0 + (t1 - t0) * k / (j2 - j1)
    # palabras del guion sin tiempo (omitidas por el reconocedor): interpolar
    known = [i for i, t in enumerate(times) if t is not None]
    for i, t in enumerate(times):
        if t is None:
            prev = max([k for k in known if k < i], default=None)
            nxt = min([k for k in known if k > i], default=None)
            lo = times[prev] if prev is not None else max(0.0, (times[nxt] if nxt is not None else 0) - 0.3)
            hi = times[nxt] if nxt is not None else dur
            gap = (nxt if nxt is not None else len(sw)) - (prev if prev is not None else -1)
            times[i] = lo + (hi - lo) * (i - (prev if prev is not None else -1)) / gap if prev is not None else lo
    return [{"w": w, "start": round(t, 3)} for w, t in zip(sw, times)]


def main(src, dst, script=None):
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=str(MODEL / "encoder.int8.onnx"), decoder=str(MODEL / "decoder.int8.onnx"),
        joiner=str(MODEL / "joiner.int8.onnx"), tokens=str(MODEL / "tokens.txt"),
        model_type="nemo_transducer", num_threads=4)
    audio = load_audio(src)
    dur = len(audio) / SR
    # Parakeet funciona mejor en trozos de < ~60 s: cortamos en ventanas de 30 s
    words, chunk = [], 30 * SR
    for off in range(0, len(audio), chunk):
        s = rec.create_stream()
        s.accept_waveform(SR, audio[off:off + chunk])
        rec.decode_stream(s)
        r, t0 = s.result, off / SR
        for i, (tok, ts) in enumerate(zip(r.tokens, r.timestamps)):
            # un token que empieza con espacio (o "▁") abre palabra nueva; cada trozo también
            if tok[:1] in (" ", "▁") or i == 0 or not words:
                words.append({"w": tok.strip(" ▁"), "start": round(t0 + ts, 3)})
            else:
                words[-1]["w"] += tok
    words = [w for w in words if w["w"].strip()]
    if script:
        for i, w in enumerate(words):
            w["end"] = words[i + 1]["start"] if i + 1 < len(words) else dur
        words = align_to_script(words, Path(script).read_text(encoding="utf-8"), dur)
    for i, w in enumerate(words):
        nxt = words[i + 1]["start"] if i + 1 < len(words) else dur
        w["end"] = round(min(nxt, w["start"] + 1.0), 3)
    out = {"duration": round(dur, 3), "text": " ".join(w["w"] for w in words), "words": words}
    Path(dst).write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"{len(words)} palabras, {dur:.1f}s -> {dst}")
    print(out["text"])


if __name__ == "__main__":
    main(*sys.argv[1:4])
