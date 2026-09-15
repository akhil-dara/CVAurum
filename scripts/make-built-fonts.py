"""Build the font families whose publisher ships OpenType instead of a stylesheet.

scripts/fetch-fonts.cjs can only take a family from a host that answers a CSS
query with `url(...woff2)` lines to rewrite. A face distributed as a bare OTF on
a file mirror has no stylesheet to parse, so it is built here instead: download
the OTFs, convert their CFF (cubic) outlines to a TrueType `glyf` table, and
write woff2 into public/fonts/ plus the matching @font-face blocks into
src/styles/fonts.css. After that scripts/make-pdf-fonts.py cannot tell the
difference — it reads the stylesheet, not the host.

TWO THINGS THIS SCRIPT DOES DELIBERATELY, both measured rather than assumed:

1. IT IS ADDITIVE. fetch-fonts.cjs regenerates src/styles/fonts.css wholesale
   and re-downloads all 45 fetched families to do it. Adding one face must not
   cost a 5.6 MB re-download, so this script owns only the region of that file
   between the two BUILT markers below and rewrites just that region in place
   (appending it if absent). fetch-fonts.cjs was taught the other half of the
   bargain: it carries this region across its own regeneration. Either script
   can now be run alone without destroying the other's output.

2. THE WOFF2 IS UNTRIMMED. make-pdf-fonts.py trims a font's scripts until its
   glyf table fits the short loca format, because fontkit's subsetter turns a
   long-loca source into blank glyphs inside a PDF. A browser has no such bug:
   it reads long loca fine. Trimming the web copy would cost real coverage for
   nothing — measured on this face, the trim drops ễ and ắ from the italics,
   two Vietnamese letters the page can render perfectly. So the web file keeps
   every glyph and only the PDF file (built downstream) is trimmed.

ONE THING TO EXPECT WHEN RE-RUNNING: the woff2 files come out a few dozen bytes
different every time, so `git status` will show all four as modified even when
nothing changed. Measured, to say which half is at fault: the OTF->TTF
conversion is byte-for-byte deterministic (two runs produced identical 190,988 B
TTFs), and only the woff2 compression varies (35,436 vs 35,508 B from the same
input). So it is the brotli encoder, not our outlines, and the downstream
public/fonts-pdf/*.ttf are stable — a rebuild never dirties those or the
short-loca test that reads them. Re-running this script when the sources have
not changed buys nothing; don't, unless FACES changed.

Build-time only; fontTools never ships to the browser.

Usage:  python scripts/make-built-fonts.py
        python scripts/make-built-fonts.py --src-dir <dir of .otf files>   (offline)

Then re-run `python scripts/make-pdf-fonts.py` to rebuild the embeddable TTFs.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import pathlib
import sys
import urllib.request

from fontTools.ttLib import TTFont, newTable
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "fonts"
CSS = ROOT / "src" / "styles" / "fonts.css"

BEGIN = "/* ===== BUILT FACES (scripts/make-built-fonts.py owns this region) ===== */"
END = "/* ===== END BUILT FACES ===== */"

# cu2qu's error budget, in font units per 1000 em — fontmake's own default.
# 1 unit is 0.001 em, i.e. 0.0105 pt at the 10.5 pt a résumé body is set at,
# which is a fifth of a device pixel at 96 dpi. The conversion is not visible.
MAX_ERR = 1.0

PATH_ = "/fonts/lm/fonts/opentype/public/lm"
# The first entry is the archive's own redirector, which hands each request to
# a randomly chosen mirror. Measured: some of those mirrors answer 403 to a
# plain urllib request, so a single-URL fetch fails roughly one run in four for
# reasons that have nothing to do with this build. The rest are named mirrors,
# tried in order until one answers.
BASES = [
    "https://mirrors.ctan.org" + PATH_,
    "https://ftp.fau.de/ctan" + PATH_,
    "https://mirror.ctan.org" + PATH_,
]

# (source file, CSS family, weight, style, sha256). The family ships a regular
# and a bold and nothing between — no 500, no 600 — which is why its registry
# entry in src/data/fonts.ts declares weights [400, 700]; resolveFontKey already
# snaps a design asking for 600 to the nearest of the two.
#
# The hashes are version 2.005 and are checked on every download. They are not
# ceremony: because the URL above resolves to a different mirror each run, the
# hash is the only thing that makes this build reproducible, and it is also what
# ties the shipped files to the version whose glyf sizes were measured — the
# regular clears the short-loca ceiling by only 14%, so a silently newer cut
# could push the PDF build over it.
FACES = [
    ("lmroman10-regular.otf", "Latin Modern Roman", 400, "normal",
     "1aa18cfefa58132c52ce5de70db1fd1154201c19cd2b2cdaffba4906a33e6852"),
    ("lmroman10-bold.otf", "Latin Modern Roman", 700, "normal",
     "102fe06c430a8b681b2bf6876b7cd967ae4d47b4b6b41d915eb7913b726d9fb1"),
    ("lmroman10-italic.otf", "Latin Modern Roman", 400, "italic",
     "c1fce25075567bb8dbf2151658c3b442690041db17a2d49fc9e55905ea5b7169"),
    ("lmroman10-bolditalic.otf", "Latin Modern Roman", 700, "italic",
     "c37a28eed7a6e03f792b98b5e5f637b2fcda378bb4855f99284f1a88fe35f124"),
]


def slug(name: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def otf_to_ttf(font: TTFont, max_err: float = MAX_ERR) -> TTFont:
    """Replace a CFF font's cubic outlines with a quadratic `glyf` table.

    pdf-lib/fontkit embeds `glyf` fonts; make-pdf-fonts.py's short-loca check
    reads `head.indexToLocFormat`, which a CFF font does not even have. So the
    conversion is not an optimisation, it is the only way this face can enter
    either half of the pipeline.
    """
    glyph_set = font.getGlyphSet()
    order = font.getGlyphOrder()
    glyf = newTable("glyf")
    glyf.glyphOrder = order
    glyf.glyphs = {}
    for name in order:
        pen = TTGlyphPen(glyph_set)
        glyph_set[name].draw(Cu2QuPen(pen, max_err, reverse_direction=True))
        glyf[name] = pen.glyph()
    font["glyf"] = glyf
    font["loca"] = newTable("loca")

    # maxp goes from the CFF version (0.5) to the TrueType one (1.0), which
    # carries a dozen fields a CFF font never had. fontTools recalculates them
    # all on compile, but they must EXIST first or the save raises.
    maxp = font["maxp"]
    maxp.tableVersion = 0x00010000
    for attr in (
        "maxPoints", "maxContours", "maxCompositePoints", "maxCompositeContours",
        "maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs",
        "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions",
        "maxComponentElements", "maxComponentDepth",
    ):
        if not hasattr(maxp, attr):
            setattr(maxp, attr, 0)
    maxp.maxZones = 1

    for tag in ("CFF ", "CFF2", "VORG"):
        if tag in font:
            del font[tag]
    font.sfntVersion = "\000\001\000\000"
    font["head"].glyphDataFormat = 0
    return font


def fetch(name: str, want_sha: str) -> tuple[bytes, str]:
    """Download `name` from the first mirror that answers, verifying its hash."""
    errors = []
    for base in BASES:
        url = f"{base}/{name}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=120) as r:  # noqa: S310 - fixed https list
                data = r.read()
        except Exception as exc:  # noqa: BLE001 - any mirror may be down or refuse us
            errors.append(f"{url}: {exc}")
            continue
        got = hashlib.sha256(data).hexdigest()
        if got != want_sha:
            # A wrong hash is never retried on another mirror: it means the
            # upstream version moved, and silently building the new one would
            # invalidate every number measured against the old.
            raise SystemExit(f"{name}: sha256 {got}\n  expected {want_sha}\n  from {url}")
        return data, url
    raise SystemExit(f"{name}: every mirror failed\n  " + "\n  ".join(errors))


def css_block(family: str, weight: int, style: str, href: str) -> str:
    # Same shape fetch-fonts.cjs emits, minus unicode-range: this face ships as
    # ONE file per style rather than as disjoint per-script subsets, so there is
    # no range to declare and the browser must use it for every codepoint it
    # covers. make-pdf-fonts.py reads family/style/weight/url and ignores the
    # rest, so the two branches are interchangeable to it.
    return (
        f"/* {family} {weight}{' italic' if style == 'italic' else ''} */\n"
        "@font-face {\n"
        f"  font-family: '{family}';\n"
        f"  font-style: {style};\n"
        f"  font-weight: {weight};\n"
        "  font-display: swap;\n"
        f"  src: url({href}) format('woff2');\n"
        "}"
    )


def splice(css_text: str, region: str) -> str:
    """Replace the BUILT region in `css_text`, or append it if it has none.

    Everything outside the two markers is returned byte-for-byte: this is what
    keeps adding one face from re-downloading the 45 fetched families.
    """
    i = css_text.find(BEGIN)
    if i == -1:
        return css_text.rstrip("\n") + "\n\n" + region + "\n"
    j = css_text.find(END, i)
    if j == -1:
        raise SystemExit(f"{CSS}: found {BEGIN!r} with no closing {END!r} — refusing to guess")
    return css_text[:i] + region + css_text[j + len(END):]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src-dir", help="read the .otf sources from here instead of downloading")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    blocks = []
    total = 0

    for src, family, weight, style, want_sha in FACES:
        if args.src_dir:
            origin = str(pathlib.Path(args.src_dir) / src)
            data = pathlib.Path(origin).read_bytes()
            got = hashlib.sha256(data).hexdigest()
            if got != want_sha:
                raise SystemExit(f"{origin}: sha256 {got}, expected {want_sha}")
        else:
            data, origin = fetch(src, want_sha)

        font = otf_to_ttf(TTFont(io.BytesIO(data)))

        # Save and reload before flavouring: fontTools only compiles glyf (and
        # so only settles loca, maxp and the table directory) on save, so the
        # woff2 must be written from the BAKED font, not the in-memory one.
        baked_buf = io.BytesIO()
        font.save(baked_buf)
        font.close()

        out_font = TTFont(io.BytesIO(baked_buf.getvalue()))
        out_font.flavor = "woff2"
        label = f"{slug(family)}-{weight}{'-italic' if style == 'italic' else ''}"
        dest = OUT_DIR / f"{label}.woff2"
        out_font.save(dest)
        cmap = len(out_font.getBestCmap())
        loca = out_font["head"].indexToLocFormat
        out_font.close()

        size = dest.stat().st_size
        total += size
        print(f"  {dest.name:38s} {size:6d} B  cmap={cmap}  loca={'long' if loca else 'short'}  <- {origin}")

        blocks.append(css_block(family, weight, style, f"/fonts/{dest.name}"))

    region = "\n".join(
        [
            BEGIN,
            "/* Built from OpenType sources by scripts/make-built-fonts.py, not fetched.",
            "   fetch-fonts.cjs preserves this region verbatim when it regenerates the",
            "   rest of this file. Licence and change log: public/fonts/LICENCE. */",
            "",
            "\n\n".join(blocks),
            END,
        ]
    )

    css_text = CSS.read_text(encoding="utf-8") if CSS.is_file() else ""
    CSS.write_text(splice(css_text, region), encoding="utf-8")

    print(f"\nwrote {len(FACES)} woff2 ({total} B, {total / 1024:.0f} KB) -> {OUT_DIR}")
    print(f"spliced {len(blocks)} @font-face rules into {CSS}")
    print("next: python scripts/make-pdf-fonts.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
