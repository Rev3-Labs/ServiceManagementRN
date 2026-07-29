"""Download remaining US DOT placard PNGs from Wikimedia Commons."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
import ssl
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "src" / "assets" / "dotHazard" / "tiles"
OUT.mkdir(parents=True, exist_ok=True)
TILE = 256
API = "https://commons.wikimedia.org/w/api.php"
UA = {
    "User-Agent": "ServiceManagementRN/1.0 (Clean Earth DOT placard UI; local asset build)"
}
CTX = ssl.create_default_context()

# Primary titles + fallbacks (Commons filenames)
FILES: dict[str, list[str]] = {
    "non-flammable-gas": [
        "HAZMAT_Class_2-2_Nonflammable_Gas.png",
        "Dangclass2_2.png",
    ],
    "poison-gas": [
        "HAZMAT_Class_2-3_Poisonous_Gas.png",
        "HAZMAT_Class_2-3_Inhalation_Hazard.png",
        "Dangclass2_3.png",
    ],
    "flammable-liquid": [
        "HAZMAT_Class_3_Flammable_Liquids.png",
        "Dangclass3.png",
    ],
    "flammable-solid": [
        "HAZMAT_Class_4-1_Flammable_Solid.png",
        "Dangclass4_1.png",
    ],
    "spontaneously-combustible": [
        "HAZMAT_Class_4-2_Spontaneously_Combustible_Solid.png",
        "Dangclass4_2.png",
    ],
    "dangerous-when-wet": [
        "HAZMAT_Class_4-3_Dangerous_when_Wet_Solid.png",
        "Dangclass4_3.png",
    ],
    "organic-peroxide": [
        "HAZMAT_Class_5-2_Organic_Peroxide_Oxidizing_Agent.png",
        "Organic_Peroxide.png",
        "Dangclass5_2.png",
    ],
    "toxic": [
        "HAZMAT_Class_6-1_Poison.png",
        "Dangclass6_1a.png",
    ],
    "biohazard": [
        "HAZMAT_Class_6-2_Biohazard.png",
        "Dangclass6_2.png",
    ],
    "radioactive": [
        "HAZMAT_Class_7_Radioactive.png",
        "Dangclass7.png",
    ],
    "corrosive": [
        "HAZMAT_Class_8_Corrosive.png",
        "Dangclass8.png",
    ],
    "class9": [
        "HAZMAT_Class_9_Miscellaneous.png",
        "Dangclass9.png",
    ],
}


def api_url(title: str) -> str | None:
    q = API + "?" + urllib.parse.urlencode(
        {
            "action": "query",
            "titles": f"File:{title}",
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
        }
    )
    req = urllib.request.Request(q, headers=UA)
    with urllib.request.urlopen(req, context=CTX, timeout=45) as resp:
        data = json.loads(resp.read().decode())
    page = next(iter(data["query"]["pages"].values()))
    info = page.get("imageinfo")
    if not info:
        return None
    return info[0]["url"]


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, context=CTX, timeout=90) as resp:
        return resp.read()


def save_tile(key: str, raw: bytes) -> None:
    path = OUT / f"{key}.png"
    path.write_bytes(raw)
    im = Image.open(path).convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS)
    im.save(path)


def main() -> None:
    ok: list[str] = []
    missing: list[str] = []

    for key, titles in FILES.items():
        path = OUT / f"{key}.png"
        if path.exists() and path.stat().st_size > 5000:
            print(f"SKIP {key}")
            ok.append(key)
            continue

        got = False
        for title in titles:
            for attempt in range(5):
                try:
                    wait = 6 + attempt * 4
                    print(f"… {key} try {title} (wait {wait}s)")
                    time.sleep(wait)
                    url = api_url(title)
                    if not url:
                        print(f"  no imageinfo for {title}")
                        break
                    time.sleep(3)
                    raw = download(url)
                    save_tile(key, raw)
                    print(f"OK {key} <- {title} ({len(raw)} bytes)")
                    ok.append(key)
                    got = True
                    break
                except Exception as exc:
                    print(f"  FAIL {key}/{title} attempt {attempt}: {exc}")
                    time.sleep(8)
            if got:
                break
        if not got:
            missing.append(key)
            print(f"MISSING {key}")

    print("---")
    print("ok:", ok)
    print("missing:", missing)


if __name__ == "__main__":
    main()
