"""The blocky construction: Flare Display's letterforms, which Dossier
Stencil (cut into bridged pieces) and Schematic Outline (every bar drawn as
its own perimeter) are made from as well. Rectangles and quadrilaterals on a
1000-unit em, uniform stroke, all angles. Returns the base glyphs - capitals,
figures and the eight marks + - . , / · : and space - as
{char: (advance, [convex contours])}; scripts/make-display-faces.py adds
everything else."""

T = 118  # stroke
CAP = 700  # cap height
MID = 350
HB = 52  # half mid-bar thickness


def R(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def Q(a, b, c, d):
    return [a, b, c, d]


def topB(w, i=0):
    return R(i, CAP - T, w - i, CAP)


def botB(w, i=0):
    return R(i, 0, w - i, T)


def midB(w, i=0):
    return R(i, MID - HB, w - i, MID + HB)


def stemL():
    return R(0, 0, T, CAP)


def stemR(w):
    return R(w - T, 0, w, CAP)


def blocky():
    """Flare Display's base glyphs, stroke 118."""
    G = {}

    def g(ch, w, *contours):
        G[ch] = (w, list(contours))

    # ---------------------------------------------------------------- letters
    g("A", 620,
      Q((0, 0), (165, 0), (350, 700), (185, 700)),
      Q((620, 0), (455, 0), (270, 700), (435, 700)),
      R(150, 235, 470, 340))
    g("B", 580,
      stemL(), R(40, CAP - T, 560, CAP), R(580 - T, MID, 580, CAP),
      R(40, MID - HB, 560, MID + HB), R(580 - T, 0, 580, MID), R(40, 0, 560, T))
    g("C", 600, R(40, CAP - T, 600, CAP), stemL(), R(40, 0, 600, T))
    g("D", 640, stemL(), R(40, CAP - T, 610, CAP), R(640 - T, 0, 640, CAP), R(40, 0, 610, T))
    g("E", 560, stemL(), topB(560), R(0, MID - HB, 500, MID + HB), botB(560))
    g("F", 560, stemL(), topB(560), R(0, MID - HB, 500, MID + HB))
    g("G", 620,
      R(40, CAP - T, 620, CAP), stemL(), R(40, 0, 620, T),
      R(620 - T, 150, 620, 360), R(380, 308, 600, 412))
    g("H", 620, stemL(), stemR(620), midB(620))
    g("I", 300, topB(300), R((300 - T) // 2, 0, (300 + T) // 2, CAP), botB(300))
    g("J", 560, R(60, CAP - T, 560, CAP), R(560 - T, 150, 560, CAP), R(60, 0, 560, T), R(60, 0, 178, 150))
    g("K", 620,
      stemL(),
      Q((110, 320), (250, 320), (590, 700), (450, 700)),
      Q((110, 300), (250, 300), (590, 0), (450, 0)))
    g("L", 560, stemL(), botB(560))
    g("M", 780,
      stemL(), stemR(780),
      Q((40, 700), (180, 700), (460, 300), (320, 300)),
      Q((600, 700), (740, 700), (460, 300), (320, 300)))
    g("N", 640, stemL(), stemR(640), Q((50, 700), (190, 700), (590, 0), (450, 0)))
    g("O", 660, topB(660), botB(660), stemL(), stemR(660))
    g("P", 600, stemL(), R(0, CAP - T, 580, CAP), R(600 - T, MID, 600, CAP), R(0, MID - HB, 580, MID + HB))
    g("Q", 660, topB(660), botB(660), stemL(), stemR(660), Q((430, 30), (550, 30), (640, 220), (520, 220)))
    g("R", 620,
      stemL(), R(0, CAP - T, 600, CAP), R(620 - T, MID, 620, CAP), R(0, MID - HB, 600, MID + HB),
      Q((260, 350), (400, 350), (600, 0), (460, 0)))
    g("S", 600, R(40, CAP - T, 600, CAP), R(0, MID, T, CAP), midB(600), R(600 - T, 0, 600, MID), R(0, 0, 560, T))
    g("T", 620, topB(620), R((620 - T) // 2, 0, (620 + T) // 2, CAP))
    g("U", 640, stemL(), stemR(640), botB(640))
    g("V", 640,
      Q((0, 700), (160, 700), (345, 0), (145, 0)),
      Q((480, 700), (640, 700), (495, 0), (295, 0)))
    g("W", 840,
      Q((0, 700), (150, 700), (285, 0), (135, 0)),
      [(135, 0), (420, 430), (705, 0), (555, 0), (420, 280), (285, 0)],
      Q((555, 0), (705, 0), (840, 700), (690, 700)))
    g("X", 620,
      Q((60, 700), (200, 700), (560, 0), (420, 0)),
      Q((420, 700), (560, 700), (200, 0), (60, 0)))
    g("Y", 620,
      Q((40, 700), (180, 700), (325, 360), (185, 360)),
      Q((440, 700), (580, 700), (435, 360), (295, 360)),
      R((620 - T) // 2, 0, (620 + T) // 2, 400))
    g("Z", 600, topB(600), botB(600), Q((450, 700), (570, 700), (150, 0), (30, 0)))

    # ---------------------------------------------------------------- digits
    g("0", 560, topB(560), botB(560), stemL(), stemR(560))
    g("1", 340, topB(340), R((340 - T) // 2, 0, (340 + T) // 2, CAP), botB(340))
    g("2", 560, topB(560), R(560 - T, MID, 560, CAP), midB(560), R(0, 0, T, MID), botB(560))
    g("3", 560, topB(560), stemR(560), R(60, MID - HB, 560, MID + HB), botB(560))
    g("4", 600, R(0, MID, T, CAP), midB(600), stemR(600))
    g("5", 560, topB(560), R(0, MID, T, CAP), midB(560), R(560 - T, 0, 560, MID), botB(560))
    g("6", 560, topB(560), stemL(), midB(560), R(560 - T, 0, 560, MID), botB(560))
    g("7", 560, topB(560), stemR(560))
    g("8", 560, topB(560), botB(560), stemL(), stemR(560), midB(560))
    g("9", 560, topB(560), stemR(560), midB(560), botB(560))

    # ---------------------------------------------------------------- the base marks
    g(" ", 300)
    g("+", 560, R((560 - T) // 2, 150, (560 + T) // 2, 550), R(140, MID - 59, 420, MID + 59))
    g("-", 360, R(40, MID - HB, 320, MID + HB))
    g(".", 300, R(95, 0, 205, 110))
    g(",", 300, R(95, 0, 205, 110), Q((95, 0), (205, 0), (150, -150), (40, -150)))
    g("/", 560, Q((40, 0), (160, 0), (520, 700), (400, 700)))
    g("·", 300, R(95, 295, 205, 405))
    g(":", 300, R(95, 430, 205, 540), R(95, 90, 205, 200))
    return G, T
