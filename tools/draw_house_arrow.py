"""Overlay the wayfinding arrow on the new house-front photo.

Same visual language as the previous house-front-arrow.jpg:
Okabe-Ito blue (#0072B2) core with a white halo so it reads on any background.
"""
import math
from PIL import Image, ImageDraw

# Run from the repo root. SRC lives under notion-images/, which is gitignored —
# the clean shot is kept locally only, so re-clone the repo and it won't be there.
SRC = "notion-images/house-front-2026-08-original.jpg"  # clean, un-annotated shot
OUT = "docs/assets/img/basement/house-front-arrow.jpg"

BLUE = (0, 114, 177)
WHITE = (255, 255, 255)

S = 4  # supersample factor

# Control points in source (1500x845) coordinates: from the public sidewalk,
# right past the fence, then up the side path to the gap between the houses.
CTRL = [
    (430, 800),
    (700, 822),
    (960, 800),
    (1128, 706),
    (1120, 590),
    (1090, 505),
    (1078, 452),
]

CORE = 21.0      # blue stroke width at the head end
HALO = 9.0       # white outline on each side
TAPER = 0.62     # stroke width multiplier at the tail
HEAD_LEN = 82.0
HEAD_HALF = 38.0

CROP = (230, 0, 1420, 845)  # left, top, right, bottom in source coordinates


def catmull_rom(pts, samples=600):
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    segs = len(p) - 3
    for i in range(segs):
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        n = max(2, samples // segs)
        for j in range(n):
            t = j / n
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
                       (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                       (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
                       (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                       (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(pts[-1])
    return out


def arclen(pts):
    d = [0.0]
    for a, b in zip(pts, pts[1:]):
        d.append(d[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return d


def dots(draw, pts, dists, total, width_at, colour):
    for (x, y), s in zip(pts, dists):
        r = width_at(s / total) / 2.0
        draw.ellipse([x - r, y - r, x + r, y + r], fill=colour)


def triangle(tip, back_dir, length, half):
    """back_dir is the unit vector pointing from tip back down the shaft."""
    bx = tip[0] + back_dir[0] * length
    by = tip[1] + back_dir[1] * length
    px, py = -back_dir[1], back_dir[0]
    return [tip, (bx + px * half, by + py * half), (bx - px * half, by - py * half)]


def grow(poly, amount):
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    out = []
    for x, y in poly:
        d = math.hypot(x - cx, y - cy) or 1.0
        out.append((x + (x - cx) / d * amount, y + (y - cy) / d * amount))
    return out


im = Image.open(SRC).convert("RGB")
W, H = im.size
canvas = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
d = ImageDraw.Draw(canvas)

path = [(x * S, y * S) for x, y in catmull_rom(CTRL)]
dists = arclen(path)
total = dists[-1]

# Stop the shaft just inside the head so the two shapes merge cleanly.
stop = total - HEAD_LEN * S * 0.72
shaft = [p for p, s in zip(path, dists) if s <= stop]
shaft_d = [s for s in dists if s <= stop]

tip = path[-1]
back = path[max(0, len(path) - 40)]
vx, vy = back[0] - tip[0], back[1] - tip[1]
n = math.hypot(vx, vy) or 1.0
back_dir = (vx / n, vy / n)
head = triangle(tip, back_dir, HEAD_LEN * S, HEAD_HALF * S)

# White halo first, blue core on top.
d.polygon(grow(head, HALO * S * 1.5), fill=WHITE)
dots(d, shaft, shaft_d, total,
     lambda t: (CORE * (TAPER + (1 - TAPER) * t) + 2 * HALO) * S, WHITE)
dots(d, shaft, shaft_d, total,
     lambda t: CORE * (TAPER + (1 - TAPER) * t) * S, BLUE)
d.polygon(head, fill=BLUE)

overlay = canvas.resize((W, H), Image.LANCZOS)
im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")

# Crop away the empty sidewalk on the left so the house and the side path fill
# the small .ph-row slot, then downscale for the guide (displayed ~150-280px).
im = im.crop(CROP)
im = im.resize((1100, round(1100 * (CROP[3] - CROP[1]) / (CROP[2] - CROP[0]))),
               Image.LANCZOS)
im.save(OUT, quality=80, optimize=True, progressive=True)
print(im.size, "-> update width/height in basementroom/index.html")
