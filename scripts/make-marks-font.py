"""Generate the bundled MARKS font — the four bullet glyphs no bundled family has.

Measured, 2026-09-16, over every bundled face (see the coverage probe in
`src/lib/pdf/fontsCoverage.test.ts`'s sibling checks and the numbers below):

    U+2022 •  bullet          158/158 PDF faces, 64/64 latin webfont subsets
    U+2013 –  en dash         158/158, 64/64
    U+203A ›  angle quote     158/158, 64/64
    U+25E6 ◦  white bullet      0/158,  4/257
    U+25AA ▪  small square      0/158,  0/257
    U+2713 ✓  check            0/158,  0/257
    U+25C6 ◆  diamond          0/158,  0/257

So three of the seven bullet styles are already drawn by whatever family the
résumé is set in, and four are not drawn by ANY of them. The canvas hid that
for two of them by asking the browser for UA list markers (`list-style-type:
circle` / `square`), which are shapes rather than glyphs and so carry no text
at all; the exporter answered with a vector dot plus an INVISIBLE text twin so
a copied list kept its boundaries, which is exactly the "text drawn invisibly"
an ATS scanner flags. The other two (✓ and ◆) were set as CSS string markers
and quietly rendered from whatever SYSTEM font the reader's machine happened to
have — a different picture on every machine, and nothing at all in the PDF's
own fonts.

This file draws those four marks as ordinary outlines in one very small font,
which BOTH the canvas (through the font stack, src/data/fonts.ts) and the
painter (through the same stack's fallback chain) use. The marker is then a
real, visible, extractable text run on both sides, drawn from the same
outlines, with nothing hidden anywhere.

LICENCE: every outline here is constructed by this script from plain
arithmetic — circles, a square, a diamond and a stroked polyline. No third-
party font data is read, copied or derived from. It is therefore covered by
this repository's own licence (see LICENSE), and the note in
public/fonts/LICENCE records that.

Usage:  python scripts/make-marks-font.py
"""

from __future__ import annotations

import os
import pathlib

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

# Reproducible builds: fontTools stamps head.created/modified from this.
os.environ.setdefault("SOURCE_DATE_EPOCH", "1700000000")

UPEM = 1000
FAMILY = "CVAurum Marks"
OUT_WEB = pathlib.Path("public/fonts/cva-marks.ttf")
OUT_PDF = pathlib.Path("public/fonts-pdf/cva-marks-400.ttf")

# Vertical placement: the bundled families put a bullet's ink between roughly
# 0.11em and 0.22em above the baseline and up to 0.46em, i.e. centred near
# 0.32em. The marks below share that centre so a list of mixed styles sits on
# one optical line.
CENTRE_Y = 320

ARC_SEGMENTS = 8  # 45-degree quadratic arcs: max radial error ~0.02% of r


def circle(pen, cx, cy, r, clockwise):
    """One closed circular contour, in QUADRATIC curves — TrueType's `glyf`
    stores nothing else, and a build that hands it cubics is refused.

    TrueType fills by the non-zero winding rule, so a ring is an outer contour
    one way round and an inner contour the other."""
    import math

    step = 2 * math.pi / ARC_SEGMENTS
    if clockwise:
        step = -step
    # An arc of angle `step` is exact at its endpoints and has its control
    # point on the bisector, at radius r / cos(step / 2).
    ctrl_r = r / math.cos(abs(step) / 2)
    on = [(cx + r * math.cos(i * step), cy + r * math.sin(i * step)) for i in range(ARC_SEGMENTS)]
    pen.moveTo(on[0])
    for i in range(ARC_SEGMENTS):
        mid = (i + 0.5) * step
        ctrl = (cx + ctrl_r * math.cos(mid), cy + ctrl_r * math.sin(mid))
        pen.qCurveTo(ctrl, on[(i + 1) % ARC_SEGMENTS])
    pen.closePath()


def polygon(pen, points):
    pen.moveTo(points[0])
    for p in points[1:]:
        pen.lineTo(p)
    pen.closePath()


def thick_polyline(pen, points, width):
    """A polyline stroked to `width` and filled — how a check mark is drawn.

    Each segment is offset by half the width on both sides and the corners are
    mitred; with only one corner (the check's elbow) an exact mitre is simple
    arithmetic and needs no general stroker."""

    def unit(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = (dx * dx + dy * dy) ** 0.5
        return dx / ln, dy / ln

    half = width / 2.0
    left, right = [], []
    for i, p in enumerate(points):
        if i == 0:
            dx, dy = unit(points[0], points[1])
            nx, ny = -dy, dx
            left.append((p[0] + nx * half, p[1] + ny * half))
            right.append((p[0] - nx * half, p[1] - ny * half))
        elif i == len(points) - 1:
            dx, dy = unit(points[-2], points[-1])
            nx, ny = -dy, dx
            left.append((p[0] + nx * half, p[1] + ny * half))
            right.append((p[0] - nx * half, p[1] - ny * half))
        else:
            d0 = unit(points[i - 1], p)
            d1 = unit(p, points[i + 1])
            # Mitre direction: the normalised bisector of the two normals.
            n0 = (-d0[1], d0[0])
            n1 = (-d1[1], d1[0])
            mx, my = n0[0] + n1[0], n0[1] + n1[1]
            mlen = (mx * mx + my * my) ** 0.5
            mx, my = mx / mlen, my / mlen
            # Length along the bisector that keeps both edges `half` away.
            cos_half = mx * n0[0] + my * n0[1]
            scale = half / cos_half
            left.append((p[0] + mx * scale, p[1] + my * scale))
            right.append((p[0] - mx * scale, p[1] - my * scale))
    polygon(pen, left + list(reversed(right)))


def build_glyphs():
    glyphs = {}
    advances = {}

    pen = TTGlyphPen(None)
    glyphs[".notdef"] = pen.glyph()
    advances[".notdef"] = 400

    pen = TTGlyphPen(None)
    glyphs["space"] = pen.glyph()
    # The families' own space advance runs 0.22-0.28em; 0.26 sits in the middle.
    # Only the marker string's trailing spaces are ever drawn from this font.
    advances["space"] = 260

    # U+25E6 WHITE BULLET — a ring the size of the UA `circle` list marker
    # (Chromium draws that at ceil(fontSize / 3), i.e. a third of the em).
    pen = TTGlyphPen(None)
    circle(pen, 215, CENTRE_Y, 165, clockwise=False)
    circle(pen, 215, CENTRE_Y, 105, clockwise=True)
    glyphs["whitebullet"] = pen.glyph()
    advances["whitebullet"] = 430

    # U+25AA BLACK SMALL SQUARE — the same third-of-an-em box the UA `square`
    # marker uses, on the shared optical centre.
    pen = TTGlyphPen(None)
    h = 165
    polygon(pen, [(215 - h, CENTRE_Y - h), (215 + h, CENTRE_Y - h), (215 + h, CENTRE_Y + h), (215 - h, CENTRE_Y + h)])
    glyphs["blacksquare"] = pen.glyph()
    advances["blacksquare"] = 430

    # U+25C6 BLACK DIAMOND — taller than it is wide, as the character is drawn
    # everywhere it exists.
    pen = TTGlyphPen(None)
    polygon(pen, [(250, CENTRE_Y - 250), (440, CENTRE_Y), (250, CENTRE_Y + 250), (60, CENTRE_Y)])
    glyphs["blackdiamond"] = pen.glyph()
    advances["blackdiamond"] = 500

    # U+2713 CHECK MARK — a stroked tick, cap-height tall so it reads at 9pt.
    pen = TTGlyphPen(None)
    thick_polyline(pen, [(70, 330), (215, 170), (525, 610)], 105)
    glyphs["checkmark"] = pen.glyph()
    advances["checkmark"] = 600

    return glyphs, advances


def main():
    glyphs, advances = build_glyphs()
    order = [".notdef", "space", "whitebullet", "blacksquare", "blackdiamond", "checkmark"]
    cmap = {
        0x0020: "space",
        0x25E6: "whitebullet",
        0x25AA: "blacksquare",
        0x25C6: "blackdiamond",
        0x2713: "checkmark",
    }

    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    # The left side bearing has to agree with the outline's own xMin, or a
    # renderer that positions from the metrics (rather than from the glyf
    # coordinates) draws every mark shifted left by that much.
    def lsb(name):
        g = fb.font['glyf'][name]
        return g.xMin if g.numberOfContours else 0

    fb.setupHorizontalMetrics({g: (advances[g], lsb(g)) for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200, lineGap=0)
    fb.setupNameTable(
        {
            "familyName": FAMILY,
            "styleName": "Regular",
            "uniqueFontIdentifier": f"{FAMILY} Regular; built by scripts/make-marks-font.py",
            "fullName": f"{FAMILY} Regular",
            "psName": FAMILY.replace(" ", ""),
            "version": "Version 1.000",
            "licenseDescription": "Outlines generated by scripts/make-marks-font.py; covered by this repository's own licence.",
        }
    )
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200, sCapHeight=700)
    fb.setupPost()

    for out in (OUT_WEB, OUT_PDF):
        out.parent.mkdir(parents=True, exist_ok=True)
        fb.save(str(out))
        print(f"  wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
