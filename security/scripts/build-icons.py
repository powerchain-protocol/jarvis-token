#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets"
OUT = SOURCE / "generated"
OUT.mkdir(parents=True, exist_ok=True)

SIZES = (16, 32, 64, 128, 180, 192, 256, 512)
SOURCES = {
    "canonical": "jarvis-green.png",
    "dark": "jarvis-logo-dark.png",
    "light": "jarvis-logo-light.png",
}

for variant, filename in SOURCES.items():
    image = Image.open(SOURCE / filename).convert("RGBA")
    if image.width != image.height:
        raise SystemExit(f"{filename} must be square")
    if image.width < 512:
        raise SystemExit(f"{filename} must be at least 512x512")
    for size in SIZES:
        resized = image.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(OUT / f"jarvis-{variant}-{size}.png", optimize=True)
        resized.save(OUT / f"jarvis-{variant}-{size}.webp", format="WEBP", lossless=True, method=6)

print(f"Generated {len(SIZES) * len(SOURCES) * 2} deterministic JARVIS PNG/WebP icon variants")
