"""The rounded constructions: Meridian Geometric (perfect circles, a monoline
stroke, pointed apexes) and Keystone Condensed (the same skeleton drawn tall
and narrow). Each returns its base glyphs - capitals, figures and the eight
marks + - . , / · : and space - as {char: (advance, [convex contours])};
scripts/make-display-faces.py adds everything else. Constructed from plain
arithmetic: arcs cut into quads and polylines stroked with mitred joints."""
import math

CAP = 700


def Q(a, b, c, d):
    return [a, b, c, d]


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

def stroke_polyline(pts, w):
    """Thick polyline with miter joints (butt caps)."""
    hw = w / 2.0
    n = len(pts)
    nrm = []
    for i in range(n - 1):
        dx = pts[i + 1][0] - pts[i][0]
        dy = pts[i + 1][1] - pts[i][1]
        L = (dx * dx + dy * dy) ** 0.5 or 1.0
        nrm.append((-dy / L, dx / L))
    quads = []
    for i in range(n - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        nx, ny = nrm[i]
        if i == 0:
            ax, ay = x0 + nx * hw, y0 + ny * hw
            bx, by = x0 - nx * hw, y0 - ny * hw
        else:
            px, py = nrm[i - 1]
            mx, my = px + nx, py + ny
            ml = (mx * mx + my * my) ** 0.5 or 1.0
            mx, my = mx / ml, my / ml
            d = hw / max(0.35, mx * nx + my * ny)
            ax, ay = x0 + mx * d, y0 + my * d
            bx, by = x0 - mx * d, y0 - my * d
        if i == n - 2:
            cx_, cy_ = x1 + nx * hw, y1 + ny * hw
            dx_, dy_ = x1 - nx * hw, y1 - ny * hw
        else:
            qx, qy = nrm[i + 1]
            mx, my = nx + qx, ny + qy
            ml = (mx * mx + my * my) ** 0.5 or 1.0
            mx, my = mx / ml, my / ml
            d = hw / max(0.35, mx * nx + my * ny)
            cx_, cy_ = x1 + mx * d, y1 + my * d
            dx_, dy_ = x1 - mx * d, y1 - my * d
        quads.append([_r((ax, ay)), _r((cx_, cy_)), _r((dx_, dy_)), _r((bx, by))])
    return quads

def tri(p1, p2, p3):
    return [_r(p1), _r(p2), _r(p3)]


def geometric():
    """Meridian Geometric, stroke 104."""
    T = 104
    G = {}

    def g(ch, w, contours):
        G[ch] = (w, contours)

    # ---------------- straight letters ----------------
    g("E", 700, [R(0,0,104,700), R(104,596,640,700), R(104,298,560,402), R(104,0,640,104)])
    g("F", 640, [R(0,0,104,700), R(104,596,620,700), R(104,298,540,402)])
    g("H", 700, [R(0,0,104,700), R(536,0,640,700), R(104,298,536,402)])
    g("I", 224, [R(60,0,164,700)])
    g("L", 660, [R(0,0,104,700), R(104,0,600,104)])
    g("T", 700, [R(0,596,640,700), R(268,0,372,700)])

    # ---------------- pointed / diagonal letters ----------------
    g("A", 720, stroke_polyline([(52,0),(360,700),(668,0)], T) + [R(190,248,530,352)])
    g("V", 720, stroke_polyline([(52,700),(360,0),(668,700)], T))
    g("W", 720, stroke_polyline([(40,700),(200,0),(360,430),(520,0),(680,700)], T))
    g("M", 720, stroke_polyline([(52,0),(52,700),(360,320),(668,700),(668,0)], T))
    g("N", 720, stroke_polyline([(52,0),(52,700),(668,0),(668,700)], T))
    g("K", 720, [R(0,0,104,700)] + stroke_polyline([(640,700),(170,330),(660,0)], T))
    g("X", 720, stroke_polyline([(52,700),(668,0)], T) + stroke_polyline([(52,0),(668,700)], T))
    g("Y", 720, stroke_polyline([(52,700),(360,310),(668,700)], T) + stroke_polyline([(360,310),(360,0)], T))
    g("Z", 720, stroke_polyline([(52,700),(668,700),(52,0),(668,0)], T))

    # ---------------- round letters ----------------
    g("O", 780, arc_ring(360,350, 350,350, T, 0, 360))
    g("C", 760, arc_ring(360,350, 340,340, T, 48, 312))
    g("G", 780, arc_ring(360,350, 350,350, T, 48, 312) + [R(400,298,700,402)])
    g("Q", 780, arc_ring(360,350, 350,350, T, 0, 360)
        + [[_r((540,140)), _r((640,200)), _r((720,-40)), _r((620,-40))]])
    g("D", 600, [R(0,0,104,700)] + arc_ring(104,350, 430,350, T, -90, 90))
    g("P", 560, [R(0,0,104,700)] + arc_ring(140,454, 330,246, T, -90, 90) + [R(104,156,470,260)])
    g("R", 620, [R(0,0,104,700)] + arc_ring(140,454, 330,246, T, -90, 90) + [R(104,156,470,260)]
        + [[_r((300,208)), _r((400,208)), _r((640,0)), _r((540,0))]])
    g("B", 580, [R(0,0,104,700)]
        + arc_ring(140,483, 300,217, T, -90, 90)
        + arc_ring(140,217, 330,217, T, -90, 90))
    g("S", 640, arc_ring(360,485, 265,215, T, 40, 320)
        + arc_ring(360,215, 265,215, T, 220, 500)
        + [R(140,298,575,402)])
    g("J", 700, [R(470,246,574,700)] + arc_ring(366,260, 260,260, T, 180, 360))
    g("U", 780, [R(0,194,104,700), R(616,194,720,700)] + arc_ring(360,194, 360,360, T, 180, 360))

    # ---------------- digits ----------------
    g("0", 700, arc_ring(320,350, 310,350, T, 0, 360))
    g("1", 620, stroke_polyline([(120,560),(320,700)], T) + [R(268,0,372,700), R(170,0,470,104)])
    g("2", 640, arc_ring(320,470, 250,230, T, 90, -90)
        + stroke_polyline([(560,430),(140,0)], T) + [R(120,0,560,104)])
    g("3", 620, arc_ring(330,495, 225,205, T, 125, -135) + arc_ring(330,205, 245,205, T, 135, -125))
    g("4", 640, stroke_polyline([(500,700),(140,80),(620,80)], T) + [R(448,0,552,700)])
    g("5", 620, [R(120,596,560,700), R(120,240,224,700)] + arc_ring(340,190, 240,190, T, 55, 305))
    g("6", 640, [R(120,280,224,700)] + arc_ring(320,240, 250,240, T, 0, 360))
    g("7", 640, [R(80,596,600,700)] + stroke_polyline([(600,700),(220,0)], T))
    g("8", 640, arc_ring(320,480, 215,220, T, 0, 360) + arc_ring(320,205, 245,205, T, 0, 360))
    g("9", 640, arc_ring(320,460, 250,240, T, 0, 360) + [R(416,0,520,460)])

    # ---------------- punctuation / misc ----------------
    g(".", 300, [R(98,0,202,104)])
    g(",", 300, [R(98,0,202,104), [_r((98,0)), _r((202,0)), _r((150,-110)), _r((60,-90))]])
    g("+", 560, [R(228,88,332,472), R(88,228,472,332)])
    g("-", 400, [R(60,298,340,402)])
    g("/", 480, [[_r((330,700)), _r((434,700)), _r((150,0)), _r((46,0))]])
    g("·", 300, [R(98,298,202,402)])
    g(":", 300, [R(98,444,202,548), R(98,96,202,200)])
    g(" ", 300, [])
    return G, T


def condensed():
    """Keystone Condensed, stroke 100."""
    T = 100
    G = {}

    def g(ch, w, contours):
        G[ch] = (w, contours)

    # ---------------- straight letters (condensed) ----------------
    g("E", 560, [R(0,0,100,700), R(100,600,520,700), R(100,300,460,400), R(100,0,520,100)])
    g("F", 520, [R(0,0,100,700), R(100,600,500,700), R(100,300,440,400)])
    g("H", 560, [R(0,0,100,700), R(460,0,560,700), R(100,300,460,400)])
    g("I", 200, [R(50,0,150,700)])
    g("L", 540, [R(0,0,100,700), R(100,0,500,100)])
    g("T", 560, [R(0,600,540,700), R(220,0,320,700)])

    # ---------------- pointed / diagonal letters (condensed) ----------------
    g("A", 560, stroke_polyline([(44,0),(280,700),(516,0)], T) + [R(150,248,410,352)])
    g("V", 560, stroke_polyline([(44,700),(280,0),(516,700)], T))
    g("W", 560, stroke_polyline([(36,700),(160,0),(280,420),(400,0),(524,700)], T))
    g("M", 560, stroke_polyline([(44,0),(44,700),(280,320),(516,700),(516,0)], T))
    g("N", 560, stroke_polyline([(44,0),(44,700),(516,0),(516,700)], T))
    g("K", 560, [R(0,0,100,700)] + stroke_polyline([(500,700),(140,330),(520,0)], T))
    g("X", 560, stroke_polyline([(44,700),(516,0)], T) + stroke_polyline([(44,0),(516,700)], T))
    g("Y", 560, stroke_polyline([(44,700),(280,310),(516,700)], T) + stroke_polyline([(280,310),(280,0)], T))
    g("Z", 560, stroke_polyline([(44,700),(516,700),(44,0),(516,0)], T))

    # ---------------- round letters (tall ellipses) ----------------
    g("O", 580, arc_ring(280,350, 260,350, T, 0, 360))
    g("C", 580, arc_ring(280,350, 260,350, T, 48, 312))
    g("G", 580, arc_ring(280,350, 260,350, T, 48, 312) + [R(300,300,540,400)])
    g("Q", 580, arc_ring(280,350, 260,350, T, 0, 360)
        + [[_r((420,140)), _r((500,190)), _r((560,-40)), _r((480,-40))]])
    g("D", 500, [R(0,0,100,700)] + arc_ring(100,350, 330,350, T, -90, 90))
    g("P", 470, [R(0,0,100,700)] + arc_ring(120,454, 250,246, T, -90, 90) + [R(100,160,370,260)])
    g("R", 520, [R(0,0,100,700)] + arc_ring(120,454, 250,246, T, -90, 90) + [R(100,160,370,260)]
        + [[_r((240,210)), _r((330,210)), _r((500,0)), _r((410,0))]])
    g("B", 470, [R(0,0,100,700)]
        + arc_ring(120,483, 230,217, T, -90, 90)
        + arc_ring(120,217, 250,217, T, -90, 90))
    g("S", 520, arc_ring(280,485, 205,215, T, 40, 320)
        + arc_ring(280,215, 205,215, T, 220, 500)
        + [R(110,300,450,400)])
    g("J", 560, [R(370,246,470,700)] + arc_ring(290,260, 200,200, T, 180, 360))
    g("U", 600, [R(0,194,100,700), R(460,194,560,700)] + arc_ring(280,194, 280,280, T, 180, 360))

    # ---------------- digits (condensed) ----------------
    g("0", 560, arc_ring(250,350, 240,350, T, 0, 360))
    g("1", 500, stroke_polyline([(100,560),(250,700)], T) + [R(200,0,300,700), R(130,0,370,100)])
    g("2", 520, arc_ring(250,470, 195,230, T, 90, -90)
        + stroke_polyline([(400,497),(110,0)], T) + [R(100,0,440,100)])
    g("3", 500, arc_ring(260,495, 175,205, T, 125, -135) + arc_ring(260,205, 185,205, T, 135, -125))
    g("4", 520, stroke_polyline([(400,700),(110,80),(490,80)], T) + [R(350,0,450,700)])
    g("5", 500, [R(100,600,450,700), R(100,240,200,700)] + arc_ring(270,190, 190,190, T, 55, 305))
    g("6", 520, [R(100,280,200,700)] + arc_ring(250,240, 200,240, T, 0, 360))
    g("7", 520, [R(60,600,480,700)] + stroke_polyline([(480,700),(180,0)], T))
    g("8", 520, arc_ring(250,480, 170,220, T, 0, 360) + arc_ring(250,205, 195,205, T, 0, 360))
    g("9", 520, arc_ring(250,460, 200,240, T, 0, 360) + [R(330,0,430,460)])

    # ---------------- punctuation / misc ----------------
    g(".", 260, [R(80,0,180,100)])
    g(",", 260, [R(80,0,180,100), [_r((80,0)), _r((180,0)), _r((130,-110)), _r((50,-90))]])
    g("+", 460, [R(180,70,280,390), R(70,180,390,280)])
    g("-", 340, [R(50,300,290,400)])
    g("/", 400, [[_r((270,700)), _r((370,700)), _r((130,0)), _r((30,0))]])
    g("\u00b7", 260, [R(80,300,180,400)])
    g(":", 260, [R(80,446,180,546), R(80,96,180,196)])
    g(" ", 260, [])
    return G, T


# ---------------------------------------------------------------- repairs
# Letters the proof constructions got wrong, redrawn on the same skeleton:
# the bowls of P, R and B floated a stroke clear of their stem (and P and R
# carried a stray bar under the bowl), S and 5 were built from arcs facing
# the wrong way, J's hook missed its own stem, G's bar ran out past the
# circle, and 2's diagonal poked through its base. Each is rebuilt from bars
# and half rings that meet exactly where the strokes join.


def _bowl(x0, y0, y1, xr, T, round_=True):
    """A bowl on the right of a stem ending at x0: a bar out from the stem
    along the top and the bottom, then a half ring to the right edge xr,
    spanning y0..y1 (outer). As round as the room allows."""
    ry = (y1 - y0) / 2.0
    cy = y0 + ry
    rx = min(ry, xr - x0) if round_ else (xr - x0) * 0.62
    cx = max(x0, xr - rx)
    return [R(x0 - 1, y1 - T, cx, y1), R(x0 - 1, y0, cx, y0 + T)] + arc_ring(cx, cy, rx, ry, T, -90, 90)


def _repair(G, T, round_=True):
    def w(ch):
        return G[ch][0]

    def g(ch, contours):
        G[ch] = (w(ch), contours)

    stem = [R(0, 0, T, CAP)]
    # N: two stems and a diagonal between their tops and feet. As one
    # polyline it doubled back at two acute corners, and the mitres there
    # stood a spike above the capitals and another below the line.
    nw = w("N")
    g("N", [R(0, 0, T, CAP), R(nw - T, 0, nw, CAP), Q((0, CAP), (T * 1.35, CAP), (nw, 0), (nw - T * 1.35, 0))])
    # P: the bowl the upper half of the letter, joined to the stem.
    g("P", stem + _bowl(T, 330, CAP, w("P") - 20, T, round_))
    # R: P's bowl and a leg out from where the bowl meets the stem's middle.
    leg_top = (T + (w("R") - 20 - T) * 0.35, 330 + T / 2)
    g("R", stem + _bowl(T, 330, CAP, w("R") - 40, T, round_) + stroke_polyline([leg_top, (w("R") - 40, 0)], T))
    # B: a smaller bowl over a larger one, sharing the middle stroke.
    mid = 380
    g("B", stem + _bowl(T, mid - T // 2, CAP, w("B") - 50, T, round_) + _bowl(T, 0, mid + T // 2, w("B"), T, round_))
    # S: two bowls sharing the middle stroke, the upper open to the right,
    # the lower open to the left.
    sw = w("S")
    cx = sw / 2.0
    rx = sw / 2.0 - 40
    top_ry = (CAP - (350 - T / 2)) / 2.0
    bot_ry = (350 + T / 2) / 2.0
    g("S", arc_ring(cx, CAP - top_ry, rx, top_ry, T, 35, 270) + arc_ring(cx, bot_ry, rx, bot_ry, T, -145, 90))
    # G: C's open ring, closed along the bottom to the right middle, and a bar
    # from the centre out to that edge.
    gw = w("G")
    gcx = gw / 2.0 - 20
    grx = gw / 2.0 - 30
    g("G", arc_ring(gcx, 350, grx, 350, T, 45, 360) + [R(gcx, 350 - T // 2, gcx + grx, 350 + T // 2)])
    # J: a stem on the right, curling into a hook below.
    jw = w("J")
    jr = (jw - 80) / 2.0
    jcx = jw - 40 - jr
    g("J", [R(jw - 40 - T, jr, jw - 40, CAP)] + arc_ring(jcx, jr, jr, jr, T, 180, 360))
    # 2: an arc over the right, a diagonal to the foot, and the base.
    tw = w("2")
    tcx = tw / 2.0
    trx = tw / 2.0 - 60
    tcy = 480
    try_ = CAP - tcy
    end = (tcx + (trx - T / 2) * math.cos(math.radians(-35)), tcy + (try_ - T / 2) * math.sin(math.radians(-35)))
    # The arc runs on past where the diagonal leaves it, so the diagonal's
    # square end is buried in the ring rather than notched against it.
    g("2", arc_ring(tcx, tcy, trx, try_, T, -58, 165) + stroke_polyline([end, (70, T / 2)], T) + [R(40, 0, tw - 40, T)])
    # U: two stems into a bowl that sits on the line. The proof's bowl was
    # centred at the stems' feet with the full cap height as its radius, so it
    # hung a quarter of a letter below the baseline.
    uw = w("U")
    ury = 250
    g("U", [R(0, ury, T, CAP), R(uw - T, ury, uw, CAP)] + arc_ring(uw / 2.0, ury, uw / 2.0, ury, T, 180, 360))
    # 6 and 9: a ring and a straight stroke leaning into it - the stem-and-ring
    # the proof drew read as b and q.
    for ch, up in (("6", False), ("9", True)):
        nw = w(ch)
        rcx = nw / 2.0
        rrx = nw / 2.0 - 50
        rry = 228
        rcy = CAP - rry if up else rry
        ang = math.radians(-40 if up else 140)
        on_ring = (rcx + (rrx - T / 2) * math.cos(ang), rcy + (rry - T / 2) * math.sin(ang))
        tip = (rcx - 60, 0) if up else (rcx + 60, CAP)
        g(ch, arc_ring(rcx, rcy, rrx, rry, T, 0, 360) + stroke_polyline([on_ring, tip], T))
    # 3: two bowls meeting at the middle of the figure, each ending at its
    # left terminal - the proof's pair overran the centre into a chevron.
    hw = w("3")
    g("3", arc_ring(hw / 2.0, 520, hw / 2.0 - 70, 180, T, 150, -90) + arc_ring(hw / 2.0, 190, hw / 2.0 - 50, 190, T, 90, -150))
    # 5: a bar across the top, a stem down the left, and a bowl open to the left.
    fw = w("5")
    fry = 205
    frx = fw / 2.0 - 40
    fcx = fw / 2.0 + 10
    # The stem stops inside the bowl's stroke, not below it.
    g("5", [R(80, CAP - T, fw - 60, CAP), R(80, 2 * fry - T * 7 // 10, 80 + T, CAP)] + arc_ring(fcx, fry, frx, fry, T, -140, 128))


_geometric, _condensed = geometric, condensed


def geometric():  # noqa: F811 - the proof's glyphs, repaired
    G, T = _geometric()
    _repair(G, T, round_=True)
    return G, T


def condensed():  # noqa: F811
    G, T = _condensed()
    _repair(G, T, round_=False)
    return G, T
