"""Generate static TTF instances of our web fonts for PDF embedding.

Our self-hosted web fonts are VARIABLE woff2 files. pdf-lib/fontkit cannot map
glyphs in a variable font — every glyph resolves to id 0, so text embedded in a
PDF extracts as NUL bytes (the same failure users hit with Firefox's print
backend, issue #4). Instancing each font at a fixed weight produces a plain
static TTF that embeds with a correct ToUnicode map.

Build-time only: fontTools is never shipped to the browser. Output goes to
public/fonts-pdf/ and is fetched on demand at export time (same-origin).

Usage:  python scripts/make-pdf-fonts.py
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = pathlib.Path("public/fonts")
OUT = pathlib.Path("public/fonts-pdf")

# Weights our templates actually reference.
WEIGHTS = [300, 400, 500, 600, 700, 800]


def family_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def family_of(font: TTFont) -> str:
    # nameID 16 = typographic family (Inter), 1 = family (Inter Thin) — prefer 16.
    return font["name"].getDebugName(16) or font["name"].getDebugName(1) or ""


# Google serves each family as SEVERAL woff2 subsets (latin, latin-ext, ...).
# They are disjoint, so picking the wrong one silently drops common characters
# and every affected glyph embeds as .notdef (text extracts as NUL). Score each
# candidate against the characters résumés actually contain and keep the best.
REQUIRED_CHARS = (
    [ord(c) for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"]
    + [ord(c) for c in " .,;:!?'\"()[]{}/\\|&@#%$+-*=<>_~^`"]
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x00B7, 0x2026]  # – — ‘ ’ “ ” • · …
    + list(range(0x00C0, 0x0100))  # Latin-1 accented letters
)


def coverage(font: TTFont) -> int:
    try:
        cmap = font.getBestCmap()
    except Exception:  # noqa: BLE001
        return 0
    return sum(1 for cp in REQUIRED_CHARS if cp in cmap)


def main() -> int:
    if not SRC.is_dir():
        print(f"no source font dir: {SRC}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)

    index: dict[str, str] = {}
    seen_static: set[str] = set()
    sources = sorted(SRC.glob("*.woff2"))
    print(f"{len(sources)} source files")

    # Pass 1 — for each family keep only the best-covering subset file.
    best: dict[str, tuple[int, pathlib.Path, dict]] = {}
    for woff2 in sources:
        try:
            probe = TTFont(woff2)  # fontTools reads woff2 directly
        except Exception as exc:  # noqa: BLE001 - report and continue
            print(f"  skip {woff2.name}: {exc}")
            continue
        slug = family_slug(family_of(probe))
        if not slug:
            probe.close()
            print(f"  skip {woff2.name}: no family name")
            continue
        axes = {a.axisTag: (a.minValue, a.maxValue) for a in probe["fvar"].axes} if "fvar" in probe else {}
        score = coverage(probe)
        probe.close()
        if slug not in best or score > best[slug][0]:
            best[slug] = (score, woff2, axes)

    print(f"{len(best)} families (best-covering subset each)")

    # Pass 2 — instance each family at every weight we use.
    for slug, (score, woff2, axes) in sorted(best.items()):
        if score < 60:
            print(f"  warn {slug}: low glyph coverage ({score}/{len(REQUIRED_CHARS)})")

        if "wght" in axes:
            lo, hi = axes["wght"]
            targets = [w for w in WEIGHTS if lo <= w <= hi]
        else:
            targets = [None]  # already static

        for weight in targets:
            key = f"{slug}|{weight or 400}"
            if key in index:
                continue
            out_name = f"{slug}-{weight or 400}.ttf"
            try:
                font = TTFont(woff2)
                if weight is not None:
                    font = instancer.instantiateVariableFont(
                        font, {"wght": weight}, inplace=True, updateFontNames=False
                    )
                font.flavor = None  # write a plain TTF, not woff2
                font.save(OUT / out_name)
                font.close()
            except Exception as exc:  # noqa: BLE001
                print(f"  fail {out_name}: {exc}")
                continue
            index[key] = out_name
            seen_static.add(out_name)

    # Drop stale outputs from earlier runs so the directory always matches the
    # index exactly (family slugs can change as the generator improves).
    for stale in OUT.glob("*.ttf"):
        if stale.name not in seen_static:
            stale.unlink()
            print("  removed stale", stale.name)

    (OUT / "index.json").write_text(json.dumps(index, indent=1, sort_keys=True), encoding="utf-8")
    total_kb = sum((OUT / f).stat().st_size for f in seen_static) // 1024
    print(f"wrote {len(index)} static fonts ({total_kb} KB) -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
