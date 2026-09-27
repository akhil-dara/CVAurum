"""Generate the constructed display faces of the signature collection.

    Flare Display        blocky construction                  (Flare)
    Dossier Stencil      blocky, every long bar cut in three  (Dossier)
    Schematic Outline    blocky, every bar drawn as its edge  (Schematic)
    Keystone Condensed   tall condensed rounds                (Keystone)
    Meridian Geometric   perfect-circle rounds                (Meridian)
    Volta Display        bold geometric, re-spaced            (Volta)

Display faces for a name and section titles, drawn from plain arithmetic -
rectangles, quadrilaterals, arcs cut into quads, stroked polylines - on a
1000-unit em, and built into real TrueType files. The base letterforms of each
construction live in scripts/display_faces/; this script adds what every face
needs on top of them, in one shared step:

WHAT THEY COVER: A-Z, 0-9, the punctuation a name or a heading uses, and the
accented letters of the Latin names the app is used for (Latin-1 and Latin
Extended-A, plus the comma-below letters). They are UNICASE: a lowercase
letter is drawn as its capital, in a glyph of its own (see below). Anything
else a heading carries falls back glyph by glyph to the face's own companion
(`chain` in src/data/fonts.ts), on the canvas and in the PDF alike.

OUTPUT, for each face:
  public/fonts/<slug>.ttf            the web copy (@font-face in artboard.css)
  public/fonts-pdf/<slug>-400.ttf    the PDF copy, indexed in index.json

All are a few tens of KB and use the short loca format (checked below):
fontkit's subsetter turns a long-loca font into blank glyphs inside a PDF
(src/lib/pdf/fontsLoca.test.ts).

LICENCE: every outline is constructed by these scripts; no third-party font
data is read, copied or derived from. Covered by this repository's own
licence, and public/fonts/LICENCE says so.

Usage:  python scripts/make-display-faces.py
"""

from __future__ import annotations

import json
import os
import pathlib
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from display_faces.blocky import blocky  # noqa: E402
from display_faces.rounded import condensed, geometric  # noqa: E402
from display_faces.volta import volta  # noqa: E402

# Reproducible builds: fontTools stamps head.created/modified from this.
os.environ.setdefault("SOURCE_DATE_EPOCH", "1700000000")

CAP = 700  # cap height, the same in every construction
MID = 350


def R(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def Q(a, b, c, d):
    return [a, b, c, d]


def shift(contour, dx=0, dy=0):
    return [(x + dx, y + dy) for x, y in contour]


# ---------------------------------------------------------------- punctuation
def extras(T):
    """The marks a name or a heading may carry beyond the base's eight, drawn
    at the construction's own stroke `T`: dashes, quotes, brackets, ! ? & # %
    and the > markers. Squared in every face - at a heading's size a mark is a
    few strokes, and a square stroke reads in all five."""
    H = T // 2  # half stroke: a bar's half-height about its centre line
    D = T  # the square a point or a dot is made of
    X = {}

    def x(ch, w, *contours):
        X[ch] = (w, list(contours))

    x("–", 520, R(40, MID - H, 480, MID + H))  # en dash
    x("—", 880, R(40, MID - H, 840, MID + H))  # em dash
    x(";", 300, R(95, 430, 95 + D, 430 + D), R(95, 0, 95 + D, D), Q((95, 0), (95 + D, 0), (150, -150), (40, -150)))
    x("•", 360, R(90, 255, 270, 435))  # bullet
    x("!", 300, R(95, 230, 95 + D, 700), R(95, 0, 95 + D, D))
    x("?", 560,
      R(0, CAP - T, 560, CAP), R(560 - T, 330, 560, CAP), R(220, 330, 560, 330 + T),
      R(220, 230, 220 + T, 330 + T), R(225, 0, 225 + D, D))
    x("'", 260, R(75, 480, 75 + D, 700))
    x("’", 260, Q((75, 700), (75 + D, 700), (75 + D, 540), (40, 440)))  # right quote / apostrophe
    x("‘", 260, Q((75, 700), (220, 800), (75 + D, 600), (75, 500)))  # left quote
    x('"', 440, R(75, 480, 75 + D, 700), R(255, 480, 255 + D, 700))
    x("“", 440, Q((75, 700), (220, 800), (75 + D, 600), (75, 500)), Q((255, 700), (400, 800), (255 + D, 600), (255, 500)))
    x("”", 440, Q((75, 700), (75 + D, 700), (75 + D, 540), (40, 440)), Q((255, 700), (255 + D, 700), (255 + D, 540), (220, 440)))
    x("(", 320,
      Q((140, 560), (140 + T, 560), (300, 800), (180, 800)),
      R(140, 140, 140 + T, 560),
      Q((140, 140), (140 + T, 140), (300, -100), (180, -100)))
    x(")", 320,
      Q((180, 560), (180 - T, 560), (20, 800), (140, 800)),
      R(180 - T, 140, 180, 560),
      Q((180, 140), (180 - T, 140), (20, -100), (140, -100)))
    x("[", 320, R(60, -100, 60 + T, 800), R(60, 800 - T, 280, 800), R(60, -100, 280, -100 + T))
    x("]", 320, R(260 - T, -100, 260, 800), R(40, 800 - T, 260, 800), R(40, -100, 260, -100 + T))
    x("&", 660,
      # a small closed bowl on top, a larger open one below, and a leg kicked out
      R(80, CAP - T, 400, CAP), R(80, 420, 80 + T, CAP), R(400 - T, 470, 400, CAP),
      Q((80, 420), (80 + T, 420), (560, 0), (420, 0)),
      R(0, 0, T, 380), R(0, 0, 360, T), Q((360, 0), (360 + T, 0), (660, 380), (660 - T, 380)))
    x("#", 620,
      R(150, 60, 150 + T, 640), R(620 - 150 - T, 60, 620 - 150, 640),
      R(40, 420, 580, 420 + 100), R(40, 180, 580, 180 + 100))
    x("%", 640, R(0, 480, 200, 700), Q((80, 0), (200, 0), (560, 700), (440, 700)), R(440, 0, 640, 220))
    x("=", 520, R(40, 430, 480, 430 + 100), R(40, 170, 480, 170 + 100))
    x("_", 560, R(0, -140, 560, -140 + 100))
    x("|", 300, R(150 - H, -100, 150 - H + T, 800))
    x("›", 360, Q((40, 100), (160, 100), (320, 350), (200, 350)), Q((200, 350), (320, 350), (160, 600), (40, 600)))
    x("‹", 360, Q((320, 100), (200, 100), (40, 350), (160, 350)), Q((160, 350), (40, 350), (200, 600), (320, 600)))
    x(">", 520, Q((40, 60), (170, 60), (480, 350), (350, 350)), Q((350, 350), (480, 350), (170, 640), (40, 640)))
    x("<", 520, Q((480, 60), (350, 60), (40, 350), (170, 350)), Q((170, 350), (40, 350), (350, 640), (480, 640)))
    return X


# ---------------------------------------------------------------- accents
# Each mark is drawn around a centre x, in the band just above the capitals
# (below the baseline for the hooks), and joined to its base letter's own
# outlines as a mark: a transform (the stencil cut, the outline) never touches
# it, since a mark is too small to take either.


def acute(cx):
    return [Q((cx - 60, 760), (cx + 40, 760), (cx + 140, 880), (cx + 40, 880))]


def grave(cx):
    return [Q((cx - 40, 760), (cx + 60, 760), (cx - 40, 880), (cx - 140, 880))]


def circumflex(cx):
    return [[(cx - 160, 760), (cx - 55, 760), (cx, 815), (cx + 55, 760), (cx + 160, 760), (cx + 50, 880), (cx - 50, 880)]]


def caron(cx):
    return [[(cx - 160, 880), (cx - 55, 880), (cx, 825), (cx + 55, 880), (cx + 160, 880), (cx + 50, 760), (cx - 50, 760)]]


def diaeresis(cx):
    return [R(cx - 170, 770, cx - 60, 880), R(cx + 60, 770, cx + 170, 880)]


def dot_above(cx):
    return [R(cx - 55, 770, cx + 55, 880)]


def macron(cx):
    return [R(cx - 160, 780, cx + 160, 870)]


def breve(cx):
    return [R(cx - 160, 760, cx + 160, 840), R(cx - 160, 760, cx - 70, 890), R(cx + 70, 760, cx + 160, 890)]


def tilde(cx):
    return [[(cx - 170, 770), (cx - 170, 840), (cx - 60, 890), (cx + 60, 840), (cx + 170, 890), (cx + 170, 820), (cx + 60, 770), (cx - 60, 820)]]


def ring(cx):
    return [R(cx - 95, 760, cx + 95, 805), R(cx - 95, 855, cx + 95, 900), R(cx - 95, 760, cx - 50, 900), R(cx + 50, 760, cx + 95, 900)]


def double_acute(cx):
    return [shift(c, -85) for c in acute(cx)] + [shift(c, 85) for c in acute(cx)]


def cedilla(cx):
    return [R(cx - 45, -100, cx + 45, 0), R(cx - 140, -200, cx + 45, -110)]


def comma_below(cx):
    return [R(cx - 55, -170, cx + 55, -60), Q((cx - 55, -170), (cx + 55, -170), (cx, -290), (cx - 110, -290))]


def ogonek(right):
    return [R(right - 110, -120, right - 20, 0), R(right - 110, -200, right + 40, -120)]


# base letter -> [(mark, codepoint)]; the mark's centre is the letter's middle
ACCENTED = {
    "A": [(grave, 0x00C0), (acute, 0x00C1), (circumflex, 0x00C2), (tilde, 0x00C3), (diaeresis, 0x00C4),
          (ring, 0x00C5), (macron, 0x0100), (breve, 0x0102)],
    "C": [(cedilla, 0x00C7), (acute, 0x0106), (circumflex, 0x0108), (dot_above, 0x010A), (caron, 0x010C)],
    "D": [(caron, 0x010E)],
    "E": [(grave, 0x00C8), (acute, 0x00C9), (circumflex, 0x00CA), (diaeresis, 0x00CB), (macron, 0x0112),
          (breve, 0x0114), (dot_above, 0x0116), (caron, 0x011A)],
    "G": [(circumflex, 0x011C), (breve, 0x011E), (dot_above, 0x0120), (comma_below, 0x0122)],
    "H": [(circumflex, 0x0124)],
    "I": [(grave, 0x00CC), (acute, 0x00CD), (circumflex, 0x00CE), (diaeresis, 0x00CF), (macron, 0x012A),
          (breve, 0x012C), (dot_above, 0x0130), (tilde, 0x0128)],
    "J": [(circumflex, 0x0134)],
    "K": [(comma_below, 0x0136)],
    "L": [(acute, 0x0139), (comma_below, 0x013B), (caron, 0x013D)],
    "N": [(tilde, 0x00D1), (acute, 0x0143), (comma_below, 0x0145), (caron, 0x0147)],
    "O": [(grave, 0x00D2), (acute, 0x00D3), (circumflex, 0x00D4), (tilde, 0x00D5), (diaeresis, 0x00D6),
          (macron, 0x014C), (breve, 0x014E), (double_acute, 0x0150)],
    "R": [(acute, 0x0154), (comma_below, 0x0156), (caron, 0x0158)],
    "S": [(acute, 0x015A), (circumflex, 0x015C), (cedilla, 0x015E), (caron, 0x0160), (comma_below, 0x0218)],
    "T": [(cedilla, 0x0162), (caron, 0x0164), (comma_below, 0x021A)],
    "U": [(grave, 0x00D9), (acute, 0x00DA), (circumflex, 0x00DB), (diaeresis, 0x00DC), (macron, 0x016A),
          (breve, 0x016C), (ring, 0x016E), (double_acute, 0x0170), (tilde, 0x0168)],
    "W": [(circumflex, 0x0174)],
    "Y": [(acute, 0x00DD), (circumflex, 0x0176), (diaeresis, 0x0178)],
    "Z": [(acute, 0x0179), (dot_above, 0x017B), (caron, 0x017D)],
}
OGONEK = {"A": 0x0104, "E": 0x0118, "I": 0x012E, "U": 0x0172}


def ligatures(G, T):
    """Æ, Œ and ẞ (the capital the unicase faces draw for ß), composed from the
    face's own A, E, O and B so they are drawn in its strokes: a name like
    Æsa, Weiß or Cœur was set with those letters borrowed from the text face
    beside it, a different shape at display size. Æ is A's left leg meeting
    an E; Œ is O's left half meeting an E; ẞ is a stem, a top bar, a diagonal
    down to the middle and B's lower bowl."""
    xs = lambda c: [x for x, _ in c]
    ys = lambda c: [y for _, y in c]
    mean = lambda v: sum(v) / len(v)
    wA, A, _ = G["A"]
    wE, E, _ = G["E"]
    wO, O, _ = G["O"]
    wB, B, _ = G["B"]

    def e_from(dx, bar_from):
        out = []
        for c in E:
            if min(ys(c)) > 150 and max(ys(c)) < 550:  # the middle bar
                lo, hi, x1 = min(ys(c)), max(ys(c)), max(xs(c))
                c = [(bar_from, lo), (x1, lo), (x1, hi), (bar_from, hi)]
            out.append(shift(c, dx))
        return out

    # Æ: the left leg, cut at the cap line (a mitred apex points above it)
    apex = wA / 2
    dx = round(apex - T / 2)
    legs = [_slab(c, 1, -1000, CAP) for c in A if max(ys(c)) > 500 and mean(xs(c)) < apex]
    legs = [c for c in legs if len(c) >= 3]
    # the middle bar runs left to meet the leg, standing in for A's crossbar
    G["Æ"] = (dx + wE, legs + e_from(dx, round(apex / 2 + T * 0.2) - dx), [])

    # Œ: the left half of O, the E standing where O's centre was
    half = wO / 2
    left = [_slab(c, 0, -10000, half) for c in O]
    dx = round(half - T / 2)
    G["Œ"] = (dx + wE, [c for c in left if len(c) >= 3] + e_from(dx, 0), [])

    # ẞ: B's stem and lower right, a top bar, and a diagonal between them
    # The top bar runs nearly to the right edge and the diagonal falls from
    # its end to the middle, as wide across as a stroke of its slope needs:
    # steep and thin, the first cut read as a broken B.
    # The lower bowl is B's pieces centred at or below the middle, cut free
    # of the stem; the diagonal lands on its top, wherever the face put it
    # (Volta's upper bowl dips below the middle, and a fixed height left a
    # notch between the two).
    xb, x1 = round(wB * 0.36), wB - round(T * 0.2)
    stem = [c for c in B if max(xs(c)) <= T + 2]
    lower = [_slab(c, 0, xb, 10000) for c in B if max(xs(c)) > T + 2 and mean(ys(c)) <= MID]
    lower = [c for c in lower if len(c) >= 3]
    yb = max(y for c in lower for _, y in c)
    run, rise = x1 - xb, CAP - yb
    W = round(T * (run * run + rise * rise) ** 0.5 / rise)
    top = R(round(T * 0.5), CAP - T, x1, CAP)
    diag = [(x1 - W, CAP), (x1, CAP), (xb + W, yb), (xb, yb)]
    G.setdefault("ẞ", (wB, stem + [top, diag] + lower, []))  # unless the face drew its own


def glyph_set(base_fn):
    """The whole face: {char: (advance less bearings, body, marks)}. The body
    is the letter's own outline, which a face's transform may cut; the marks
    are accents and bars added to it, which it never touches."""
    base, T = base_fn()
    G = {ch: (w, list(cs), []) for ch, (w, cs) in base.items()}
    for ch, (w, cs) in extras(T).items():
        G.setdefault(ch, (w, list(cs), []))
    ligatures(G, T)

    def accented(ch, letter, *marks):
        w, body, solid = G[letter]
        G[ch] = (w, list(body), list(solid) + list(marks))

    for letter, marks in ACCENTED.items():
        for mark, cp in marks:
            accented(chr(cp), letter, *mark(G[letter][0] // 2))
    for letter, cp in OGONEK.items():
        accented(chr(cp), letter, *ogonek(G[letter][0]))
    # Letters with a bar through them, and the stroked O.
    bar = T * 3 // 4
    accented("Đ", "D", R(-70, MID - bar // 2, 240, MID + bar // 2))  # Đ
    accented("Ð", "D", R(-70, MID - bar // 2, 240, MID + bar // 2))  # Ð
    accented("Ł", "L", Q((-50, 250), (-50, 250 + bar), (270, 415 + bar), (270, 415)))  # Ł
    w = G["O"][0]
    accented("Ø", "O", Q((40, -40), (40 + bar, -40), (w - 40, 740), (w - 40 - bar, 740)))  # Ø
    accented("Ħ", "H", R(-40, 540, G["H"][0] + 40, 540 + bar * 2 // 3))  # Ħ
    wT = G["T"][0]
    accented("Ŧ", "T", R(wT // 5, MID - bar // 2, wT - wT // 5, MID + bar // 2))  # Ŧ
    wL = G["L"][0]
    accented("Ŀ", "L", R(wL * 11 // 20, MID - T // 2, wL * 11 // 20 + T, MID + T // 2))  # Ŀ, the Catalan middle dot
    # Ĳ, the Dutch IJ, and ŉ: two glyphs set as one
    gap = T // 2
    wI, bI, _ = G["I"]
    wJ, bJ, _ = G["J"]
    G["Ĳ"] = (wI + gap + wJ, list(bI) + [shift(c, wI + gap) for c in bJ], [])
    wq, bq, _ = G["’"]
    wN, bN, _ = G["N"]
    G["ŉ"] = (wq + wN, list(bq) + [shift(c, wq) for c in bN], [])
    G["ĸ"] = G["K"]  # kra: no capital of its own, and the face is unicase
    # Þ, the Icelandic thorn: P's stem with its bowl lowered to the middle
    wP, bP, _ = G["P"]
    drop = CAP // 6
    G["Þ"] = (wP, [c if max(x for x, _ in c) <= T + 2 else shift(c, 0, -drop) for c in bP], [])

    # UNICASE: every lowercase letter is its OWN glyph, drawn as its capital.
    # Mapping "a" to the "A" glyph would look the same on the page, but a
    # PDF's ToUnicode map gives one glyph one character, so "Anita" would come
    # back out of the text layer as "ANITA" (or worse). A separate glyph per
    # letter keeps the author's own case in the file an ATS reads, while the
    # page shows the capitals the face is drawn in - and no stylesheet has to
    # transform the text first, so the face behaves the same in any template.
    for ch in list(G):
        low = ch.lower()
        if ch.isalpha() and len(low) == 1 and low != ch and low not in G:
            G[low] = G[ch]
    G["ı"] = G["I"]  # dotless i, which Turkish capitalises as I
    return G


# ---------------------------------------------------------------- transforms
def _clip_poly(poly, axis, bound, keep_ge):
    out = []
    n = len(poly)
    for i in range(n):
        cur = poly[i]
        prev = poly[(i - 1) % n]
        cv = cur[axis]
        pv = prev[axis]
        cin = cv >= bound if keep_ge else cv <= bound
        pin = pv >= bound if keep_ge else pv <= bound
        if cin:
            if not pin and cv != pv:
                t = (bound - pv) / (cv - pv)
                out.append((round(prev[0] + (cur[0] - prev[0]) * t), round(prev[1] + (cur[1] - prev[1]) * t)))
            out.append((round(cur[0]), round(cur[1])))
        elif pin and cv != pv:
            t = (bound - pv) / (cv - pv)
            out.append((round(prev[0] + (cur[0] - prev[0]) * t), round(prev[1] + (cur[1] - prev[1]) * t)))
    return out


def _slab(poly, axis, lo, hi):
    p = _clip_poly(poly, axis, lo, True)
    return _clip_poly(p, axis, hi, False) if p else []


def _convex(contour):
    """A slab clip is exact only for a convex outline - true of every bar and
    quad here, not of the zigzags (tilde, circumflex, W's middle)."""
    n = len(contour)
    sign = 0
    for i in range(n):
        ax, ay = contour[i]
        bx, by = contour[(i + 1) % n]
        cx, cy = contour[(i + 2) % n]
        cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx)
        if cross:
            s = 1 if cross > 0 else -1
            if sign and s != sign:
                return False
            sign = s
    return True


STENCIL_GAP = 34


def stencil(ch, contour):
    """Dossier's cut: every long bar of a letter or a figure guillotined into
    three pieces along its length with small bridges left out. Punctuation is
    too small to take a bridge and stays solid."""
    if not ch.isalnum():
        return [contour]
    xs = [pt[0] for pt in contour]
    ys = [pt[1] for pt in contour]
    w = max(xs) - min(xs)
    h = max(ys) - min(ys)
    if w < 1 or h < 1 or not _convex(contour):
        return [contour]
    # ẞ's diagonal stays whole, as A's legs read: cut, it fell into slivers
    # that filled the bridges of the bars it crosses.
    if ch in "ẞß" and len(contour) == 4 and len(set(xs)) == 4:
        return [contour]
    axis = 0 if w >= h else 1
    lo = min(xs) if axis == 0 else min(ys)
    hi = max(xs) if axis == 0 else max(ys)
    if hi - lo < 210:  # dots and small bits stay solid
        return [contour]
    t1 = lo + (hi - lo) / 3.0
    t2 = lo + 2.0 * (hi - lo) / 3.0
    gap = STENCIL_GAP / 2.0
    pieces = [_slab(contour, axis, lo, t1 - gap), _slab(contour, axis, t1 + gap, t2 - gap), _slab(contour, axis, t2 + gap, hi)]
    return [pc for pc in pieces if len(pc) >= 3]


OUTLINE_T = 36


def outline(ch, contour):
    """Schematic's drawing: every solid bar becomes its own perimeter - each
    edge of the (convex) shape a thin strip hugging the inside of that edge.
    Solid strips only, so there is no hole for a winding rule to get wrong,
    and where two bars overlap both perimeters show, like construction lines
    on a drawing."""
    if not _convex(contour):
        return [contour]
    cx = sum(pt[0] for pt in contour) / float(len(contour))
    cy = sum(pt[1] for pt in contour) / float(len(contour))
    strips = []
    n = len(contour)
    for i in range(n):
        ax, ay = contour[i]
        bx, by = contour[(i + 1) % n]
        ex, ey = bx - ax, by - ay
        L = (ex * ex + ey * ey) ** 0.5
        if L < 1:
            continue
        nx, ny = -ey / L, ex / L  # candidate inward normal
        mx, my = (ax + bx) / 2.0, (ay + by) / 2.0
        if (cx - mx) * nx + (cy - my) * ny < 0:
            nx, ny = -nx, -ny
        strips.append([(round(ax), round(ay)), (round(bx), round(by)),
                       (round(bx + nx * OUTLINE_T), round(by + ny * OUTLINE_T)),
                       (round(ax + nx * OUTLINE_T), round(ay + ny * OUTLINE_T))])
    return strips


def clockwise(contour):
    """Every contour wound one way (clockwise, TrueType's outer direction).

    The strokes of a letter are separate overlapping shapes - A's two legs
    cross, a crossbar runs into a stem - and a TrueType glyph is filled by the
    non-zero winding rule: where two shapes of the SAME direction overlap the
    overlap stays ink, where two of OPPOSITE directions overlap it cancels to
    paper. The constructions wind their quads whichever way their corners
    were listed, so measured on the first build a white notch sat in the
    crossing of A, K, M, N, R, G and W. One direction for all of them, and
    every overlap is simply ink."""
    area = 0
    n = len(contour)
    for i in range(n):
        x0, y0 = contour[i]
        x1, y1 = contour[(i + 1) % n]
        area += x0 * y1 - x1 * y0
    return list(reversed(contour)) if area > 0 else contour


# ---------------------------------------------------------------- build
def glyph_name(ch):
    cp = ord(ch)
    if ch == " ":
        return "space"
    if "A" <= ch <= "Z" or "a" <= ch <= "z":
        return ch
    if "0" <= ch <= "9":
        return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][cp - 48]
    return f"uni{cp:04X}"


# Letters whose round sides stand clear of the stem-to-stem rhythm by their
# own curve: they take a narrower side bearing, as every text face does.
ROUND = set("OCGQSD0689@3")


# Letters built from stroked diagonals, whose mitred points overshoot the
# cap line and the baseline by up to a fifth of a letter (A and M stood 20%
# above the rest of a heading, V and W hung below it). Trimmed to a hair past
# both lines, as a drawn geometric face trims its points.
POINTED = set("AMNVWKXYZ47")
TRIM = 14


def trimmed(contour):
    p = _slab(contour, 1, -TRIM, CAP + TRIM)
    return p if len(p) >= 3 else []


def build(family, slug, base_fn, transform=None, respace=None, trim=False):
    """`respace` is a side bearing in font units: when given, every glyph is
    set that far in from its own outline on both sides, rather than keeping
    the advance its construction listed."""
    G = glyph_set(base_fn)
    glyphs = {}
    advances = {}
    order = [".notdef"]
    cmap = {}
    pen = TTGlyphPen(None)
    glyphs[".notdef"] = pen.glyph()
    advances[".notdef"] = 520
    for ch, (w, body, marks) in G.items():
        name = glyph_name(ch)
        order.append(name)
        cmap[ord(ch)] = name
        pen = TTGlyphPen(None)
        shape = [trimmed(c) if trim and ch.upper() in POINTED else c for c in body]
        pieces = [pc for c in shape if c for pc in (transform(ch, c) if transform else [c])] + marks
        advance = w + 80
        drawn = [pc for pc in pieces if len(pc) >= 3]
        if respace and drawn:
            xs = [x for pc in drawn for x, _ in pc]
            sb = round(respace * (0.8 if ch.upper() in ROUND else 1))
            dx = sb - min(xs)
            pieces = [shift(pc, dx) for pc in drawn]
            advance = max(xs) - min(xs) + 2 * sb
        for piece in pieces:
            if len(piece) >= 3:
                piece = clockwise(piece)
                pen.moveTo(piece[0])
                for pt in piece[1:]:
                    pen.lineTo(pt)
                pen.closePath()
        glyphs[name] = pen.glyph()
        advances[name] = advance

    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)

    # The left side bearing has to agree with the outline's own xMin, or a
    # renderer that positions from the metrics draws the glyph shifted.
    def lsb(name):
        gl = fb.font["glyf"][name]
        return gl.xMin if gl.numberOfContours else 0

    fb.setupHorizontalMetrics({n: (advances[n], lsb(n)) for n in order})
    fb.setupHorizontalHeader(ascent=850, descent=-250, lineGap=0)
    fb.setupOS2(sTypoAscender=850, sTypoDescender=-250, usWinAscent=920, usWinDescent=300, sCapHeight=CAP, sxHeight=CAP)
    ps = family.replace(" ", "")
    fb.setupNameTable({
        "familyName": family,
        "styleName": "Regular",
        "uniqueFontIdentifier": f"{family} Regular; built by scripts/make-display-faces.py",
        "fullName": f"{family} Regular",
        "psName": f"{ps}-Regular",
        "version": "Version 1.100",
        "licenseDescription": "Outlines generated by scripts/make-display-faces.py; covered by this repository's own licence.",
    })
    fb.setupPost()

    outs = [pathlib.Path(f"public/fonts/{slug}.ttf"), pathlib.Path(f"public/fonts-pdf/{slug}-400.ttf")]
    for out in outs:
        out.parent.mkdir(parents=True, exist_ok=True)
        fb.save(str(out))
        font = TTFont(str(out))
        assert font["head"].indexToLocFormat == 0, f"{out}: long loca - fontkit would subset blank glyphs"
        print(f"  wrote {out} ({out.stat().st_size} bytes, {len(order)} glyphs)")


FACES = [
    ("Flare Display", "flare-display", blocky, None),
    ("Dossier Stencil", "dossier-stencil", blocky, stencil),
    ("Schematic Outline", "schematic-outline", blocky, outline),
    ("Keystone Condensed", "keystone-condensed", condensed, None, 50, True),
    ("Meridian Geometric", "meridian-geometric", geometric, None, 55, True),
    ("Volta Display", "volta-display", volta, None, 55, True),
]


def main():
    index_path = pathlib.Path("public/fonts-pdf/index.json")
    index = json.loads(index_path.read_text(encoding="utf8"))
    for family, slug, base_fn, transform, *spacing in FACES:
        build(family, slug, base_fn, transform, *spacing)
        index[f"{slug}|400"] = f"{slug}-400.ttf"
    # The index's own format: one-space indent, sorted, no trailing newline.
    index_path.write_bytes(json.dumps(dict(sorted(index.items())), indent=1).encode("utf8"))
    print(f"  indexed in {index_path}")


if __name__ == "__main__":
    main()
