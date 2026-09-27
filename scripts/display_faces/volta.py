"""Volta Display: a bold geometric construction - stroke 120, round O and C,
square-shouldered P and R, pointed apexes. Returns the base glyphs (capitals,
figures and the eight marks + - . , / · : and space) as
{char: (advance, [convex contours])}; scripts/make-display-faces.py adds the
rest, and re-spaces every glyph from its own outline (the proof's side
bearings ran from 0 to 260 units, which is what set "MI HI R" apart).

The proof's lowercase is not carried: the face is unicase like the others, a
lowercase letter drawn as its capital. S, G, J and U are redrawn on the
rounded repairs (display_faces/rounded.py), whose constructions they shared.
"""
import math

CAP = 700


def _r(pt):
    return (round(pt[0]), round(pt[1]))

def R(x0, y0, x1, y1):
    return [(_r((x0, y0))), (_r((x1, y0))), (_r((x1, y1))), (_r((x0, y1)))]

def _polar(cx, cy, rx, ry, deg):
    a = math.radians(deg)
    return (cx + rx * math.cos(a), cy + ry * math.sin(a))

def arc_ring(cx, cy, orx, ory, t, a0, a1, n=28):
    """Ring segment from angle a0 to a1 (degrees, CCW positive, y-up).
    Returns a list of convex quads (trapezoids)."""
    quads = []
    steps = max(3, int(n * abs(a1 - a0) / 360.0))
    for i in range(steps):
        t0 = a0 + (a1 - a0) * i / steps
        t1 = a0 + (a1 - a0) * (i + 1) / steps
        o0 = _r(_polar(cx, cy, orx, ory, t0))
        o1 = _r(_polar(cx, cy, orx, ory, t1))
        i1 = _r(_polar(cx, cy, orx - t, ory - t, t1))
        i0 = _r(_polar(cx, cy, orx - t, ory - t, t0))
        quads.append([o0, o1, i1, i0])
    return quads

def disc(cx, cy, r, n=40):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        pts.append(_r((cx + r * math.cos(a), cy + r * math.sin(a))))
    return pts

def star(cx, cy, r1, r2, n=6):
    pts = []
    for i in range(n * 2):
        a = math.pi / 2 + math.pi * i / n
        r = r1 if i % 2 == 0 else r2
        pts.append(_r((cx + r * math.cos(a), cy + r * math.sin(a))))
    return pts

def stroke_polyline(pts, w):
    """Thick polyline as overlapping segment quads (butt caps). Simple and robust."""
    hw = w / 2.0
    quads = []
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        dx, dy = x1 - x0, y1 - y0
        L = (dx * dx + dy * dy) ** 0.5 or 1.0
        nx, ny = -dy / L * hw, dx / L * hw
        quads.append([_r((x0 + nx, y0 + ny)), _r((x0 - nx, y0 - ny)),
                      _r((x1 - nx, y1 - ny)), _r((x1 + nx, y1 + ny))])
    return quads

def tri(p1, p2, p3):
    return [_r(p1), _r(p2), _r(p3)]


def volta():
    """Volta Display's base glyphs, stroke 120."""
    T = 120
    G = {}

    def g(ch, w, contours):
        G[ch] = (w, contours)

    # ---------------- caps: clean geometric grotesque ----------------
    g("E", 620, [R(0,0,120,700), R(120,580,580,700), R(120,290,520,410), R(120,0,580,120)])
    g("F", 580, [R(0,0,120,700), R(120,580,560,700), R(120,290,500,410)])
    g("H", 640, [R(0,0,120,700), R(520,0,640,700), R(120,290,520,410)])
    g("I", 320, [R(100,0,220,700)])
    g("L", 600, [R(0,0,120,700), R(120,0,560,120)])
    g("T", 620, [R(10,580,610,700), R(250,0,370,580)])
    g("A", 640, stroke_polyline([(60,0),(320,700),(580,0)], T) + [R(190,230,450,350)])
    g("V", 640, stroke_polyline([(60,700),(320,0),(580,700)], T))
    g("W", 700, stroke_polyline([(50,700),(195,0),(350,430),(505,0),(650,700)], T))
    g("M", 700, stroke_polyline([(60,0),(60,700),(350,300),(640,700),(640,0)], T))
    g("N", 660, [R(0,0,120,700), R(540,0,660,700), [_r((60,700)), _r((480,0)), _r((600,0)), _r((180,700))]])
    g("K", 620, [R(0,0,120,700)] + stroke_polyline([(580,700),(160,330),(600,0)], T))
    g("X", 640, stroke_polyline([(60,700),(580,0)], T) + stroke_polyline([(60,0),(580,700)], T))
    g("Y", 620, stroke_polyline([(60,700),(320,320),(580,700)], T) + [R(260,0,380,320)])
    g("Z", 620, stroke_polyline([(60,700),(580,700),(60,0),(580,0)], T))
    g("O", 660, arc_ring(330,350, 270,290, T, 0, 360))
    g("C", 660, arc_ring(330,350, 270,290, T, 42, 318))
    g("G", 660, [R(80,580,580,700), R(80,120,200,580), R(80,0,580,120), R(460,120,580,420), R(330,290,580,410)])
    g("Q", 660, arc_ring(330,350, 270,270, T, 0, 360) + stroke_polyline([(480,180),(560,40),(620,-60)], T))
    g("D", 640, [R(0,0,120,700)] + arc_ring(100,350, 400,350, T, -90, 90))
    g("P", 580, [R(0,0,120,700), R(120,580,460,700), R(340,340,460,580), R(120,340,460,460)])
    g("R", 620, [R(0,0,120,700), R(120,580,480,700), R(360,340,480,580), R(120,340,480,460)]
        + [[_r((300,340)), _r((500,0)), _r((620,0)), _r((420,340))]])
    g("B", 580, [R(0,0,120,700)]
        + arc_ring(120,520, 230,190, T, -90, 90)
        + arc_ring(120,180, 250,190, T, -90, 90))
    g("S", 600, arc_ring(320,490, 230,210, T, 40, 320)
        + arc_ring(320,210, 230,210, T, 220, 500)
        + [R(150,290,490,410)])
    g("J", 580, [R(410,240,530,700)] + arc_ring(330,250, 230,230, T, 180, 360))
    g("U", 660, [R(0,190,120,700), R(540,190,660,700)] + arc_ring(330,190, 330,330, T, 180, 360))

    # ---------------- digits: tabular, advance 620, joints buried ----------------
    g("0", 620, arc_ring(310,350, 250,300, T, 0, 360))
    g("1", 620, stroke_polyline([(170,540),(300,650)], T) + [R(250,0,370,700), R(190,0,430,120)])
    g("2", 620, stroke_polyline([(170,600),(230,670),(320,695),(410,670),(460,600),(450,510),(400,430),(320,330),(240,220),(180,100)], T) + [R(150,0,470,120)])
    g("3", 620, stroke_polyline([(200,600),(270,670),(360,680),(430,640),(450,560),(420,490),(360,450),(300,440)], T)
        + stroke_polyline([(300,440),(360,430),(430,390),(450,310),(420,230),(350,180),(270,170),(200,210)], T))
    g("4", 620, [[_r((400,700)), _r((200,340)), _r((300,340)), _r((500,700))]]
        + [R(180,240,520,360), R(380,0,500,700)])  # diagonal leaves a white counter
    g("5", 620, [R(140,580,490,700)] + stroke_polyline([(200,600),(200,350),(230,280),(300,230),(380,240),(430,300),(420,370),(370,420),(300,430),(240,410)], T))
    g("6", 620, arc_ring(310,230, 230,230, T, 0, 360)
        + stroke_polyline([(420,700),(360,630),(320,540),(315,450),(340,380)], T))
    g("7", 620, [R(110,580,510,700), [_r((430,660)), _r((230,0)), _r((290,0)), _r((490,660))]])
    g("8", 620, arc_ring(310,490, 190,210, T, 0, 360) + arc_ring(310,180, 215,200, T, 0, 360))
    g("9", 620, arc_ring(310,470, 230,230, T, 0, 360) + [R(420,0,540,460)])

    # ---------------- punctuation / misc ----------------
    g(".", 280, [R(80,0,200,120)])
    g(",", 280, [R(80,0,200,120), [_r((80,0)), _r((50,-100)), _r((140,-120)), _r((200,0))]])
    g("+", 480, [R(180,80,300,400), R(80,180,400,300)])
    g("-", 360, [R(60,290,300,410)])
    g("/", 420, [[_r((280,700)), _r((30,0)), _r((140,0)), _r((390,700))]])
    g("\u00b7", 280, [R(80,290,200,410)])
    g(":", 280, [R(80,440,200,560), R(80,90,200,210)])
    g(" ", 280, [])
    from .rounded import _repair

    # The proof drew its rounds short: O, C and Q 580 units tall and the zero
    # 600, against capitals of 700, so a C beside an E read as lowercase. A
    # round letter stands the full height, a hair over (the overshoot every
    # face gives a curve so it looks as tall as a flat).
    g("O", 660, arc_ring(330, 350, 280, 358, T, 0, 360))
    g("C", 660, arc_ring(330, 350, 280, 358, T, 42, 318))
    g("Q", 660, arc_ring(330, 350, 280, 358, T, 0, 360) + stroke_polyline([(470, 170), (560, 40), (630, -60)], T))
    g("0", 620, arc_ring(310, 350, 250, 355, T, 0, 360))
    # Its 3 and 4 were polylines of short straight segments, jagged at size.
    # Two bowls that meet at the middle of the figure: the upper from its
    # left terminal round to the centre, the lower from the centre round to
    # its left terminal. Ending each bowl past the centre made a chevron.
    g("3", 620, arc_ring(310, 520, 220, 180, T, 150, -90) + arc_ring(310, 190, 240, 190, T, 90, -150))
    g("4", 620, stroke_polyline([(470, 700), (120, 90), (600, 90)], T) + [R(410, 0, 530, 700)])

    # The capital sharp s. B's lower bowl is too small to lend one (its inner
    # counter is 70 units), so the bowl is the 3's lower one, and a diagonal
    # falls to it from the top bar's end; make-display-faces.py composes the
    # other faces' from their B.
    g("ẞ", 600,
      [R(0, 0, 120, 700), R(60, 580, 560, 700),
       [_r((417, 700)), _r((560, 700)), _r((413, 380)), _r((270, 380))]]
      + arc_ring(330, 190, 230, 190, T, 90, -150))

    fixed = dict(G)
    _repair(fixed, T, round_=True)
    for ch in "SGJU2569":
        G[ch] = fixed[ch]
    return G, T
