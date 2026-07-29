"""Build / refresh the DOT placard spritesheet from individual tile PNGs.

Place 256x256 (or any square) PNGs in:
  src/assets/dotHazard/tiles/<labelType>.png

Then run:
  py scripts/build-dot-hazard-sprites.py

Sources: US DOT Emergency Response Guidebook placards via Wikimedia Commons
(public domain / US Government work).
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TILES_DIR = ROOT / "src" / "assets" / "dotHazard" / "tiles"
OUT_DIR = ROOT / "src" / "assets" / "dotHazard"

# Keep in sync with DotHazardLabelType in src/utils/dotHazardLabel.ts
LABEL_ORDER = [
    "explosives",
    "flammable-gas",
    "non-flammable-gas",
    "poison-gas",
    "flammable-liquid",
    "flammable-solid",
    "spontaneously-combustible",
    "dangerous-when-wet",
    "oxidizer",
    "organic-peroxide",
    "toxic",
    "biohazard",
    "radioactive",
    "corrosive",
    "class9",
]

TILE = 256
COLS = 5


def main() -> None:
    tiles: list[tuple[str, Image.Image]] = []
    for key in LABEL_ORDER:
        path = TILES_DIR / f"{key}.png"
        if not path.exists():
            print(f"skip missing {key}")
            continue
        im = Image.open(path).convert("RGBA").resize(
            (TILE, TILE), Image.Resampling.LANCZOS
        )
        tiles.append((key, im))
        print(f"include {key}")

    if not tiles:
        raise SystemExit(f"No tiles found in {TILES_DIR}")

    rows = (len(tiles) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * TILE, rows * TILE), (0, 0, 0, 0))
    frames = {}
    for idx, (key, im) in enumerate(tiles):
        col = idx % COLS
        row = idx // COLS
        sheet.paste(im, (col * TILE, row * TILE))
        frames[key] = {"col": col, "row": row}

    mapping = {
        "tileSize": TILE,
        "columns": COLS,
        "rows": rows,
        "image": "placard-sprites.png",
        "frames": frames,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet_path = OUT_DIR / "placard-sprites.png"
    map_path = OUT_DIR / "placard-sprites.json"
    sheet.save(sheet_path)
    map_path.write_text(json.dumps(mapping, indent=2), encoding="utf-8")
    print(f"wrote {sheet_path} ({sheet.size[0]}x{sheet.size[1]})")
    print(f"wrote {map_path} ({len(frames)} frames)")


if __name__ == "__main__":
    main()
