#!/usr/bin/env python3
"""Draw the pose reference boards in docs/poses/: one PNG per animation, showing its key poses as a
simple original stick figure on the real 768x768 canvas (pivot cross at 384,736, 500 px height line).

The boards say what each animation must *do* for the engine (where the body is, what reaches where,
where it starts and ends). They are not a style or anatomy reference. Lead limbs (nearer the opponent)
are orange, rear limbs blue. Usage: python3 scripts/pose_boards.py   (needs Pillow)
"""
import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

S = 4  # poses below are in quarter pixels: 125 units = 500 px standing height
CANVAS, PX, PY, CELL = 768, 384, 736, 384
OUT = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'poses'
LEAD, REAR, BODY, GHOST = (235, 120, 40), (60, 120, 220), (60, 60, 70), (170, 170, 180)

IDLE = dict(h=(4, -115), n=(2, -104), p=(0, -62), fe=(14, -88), fh=(22, -102), be=(2, -84), bh=(14, -97),
            fk=(12, -32), ff=(16, 0), bk=(-10, -32), bf=(-16, 0))


def P(base=IDLE, **kw):
    d = dict(base)
    d.update(kw)
    return d


def shift(pose, dx, dy):
    return {k: (x + dx, y + dy) for k, (x, y) in pose.items()}


def rot(pose, deg, about=None):
    ox, oy = about or pose['p']
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return {k: (ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c) for k, (x, y) in pose.items()}


def mirror(pose):
    return {k: (-x, y) for k, (x, y) in pose.items()}


CROUCH = dict(h=(9, -86), n=(6, -76), p=(0, -36), fe=(18, -62), fh=(24, -74), be=(8, -58), bh=(18, -70),
              fk=(20, -22), ff=(14, 0), bk=(-14, -20), bf=(-18, 0))
AIR = P(p=(0, -70), n=(2, -112), h=(4, -122), fk=(14, -54), ff=(8, -34), bk=(-4, -50), bf=(-14, -32),
        fe=(14, -96), fh=(22, -108), be=(2, -92), bh=(14, -104))
LIE = dict(h=(-60, -10), n=(-48, -10), p=(-6, -9), fe=(-34, -6), fh=(-20, -4), be=(-40, -4), bh=(-56, -2),
           fk=(18, -18), ff=(42, -4), bk=(16, -12), bf=(40, -6))
KNEEL = dict(h=(2, -82), n=(0, -72), p=(-4, -32), fe=(10, -54), fh=(16, -40), be=(-6, -52), bh=(4, -40),
             fk=(14, -24), ff=(16, 0), bk=(-14, -2), bf=(-36, 0))
GRABBED = P(h=(-2, -115), n=(0, -104), fe=(16, -116), fh=(20, -130), be=(8, -112), bh=(10, -128))

# Partner offsets for the universal throw: where the victim's pivot goes, relative to the thrower's
# pivot, in final pixels, thrower facing right. Thrown frames rotate around the hips (250 px above pivot).
THROW_PATH = [(150, 0), (90, -120), (0, -360), (-170, -200)]
LAND = (-240, 0)

# id: [(label, pose, extras)], extras = list of (pose, (dx_px, dy_px), mirrored) ghosts and notes
A = {
    'idle': [('01 loop start', IDLE, None), ('mid (breathe)', P(n=(2, -102), h=(4, -113), fh=(22, -100), bh=(14, -95)), None)],
    'turn': [('01 facing away', mirror(IDLE), None), ('02 front-on', P(fe=(8, -88), fh=(10, -102), be=(-8, -88), bh=(-10, -102), fk=(6, -32), ff=(8, 0), bk=(-6, -32), bf=(-8, 0), h=(0, -115), n=(0, -104)), None), ('last = idle 01', IDLE, None)],
    'walk': [('contact', P(fk=(16, -32), ff=(26, 0), bk=(-8, -30), bf=(-24, 0)), None), ('passing', P(fk=(6, -34), ff=(2, 0), bk=(4, -30), bf=(-4, -8)), None), ('in place, no travel', P(fk=(14, -32), ff=(6, -6), bk=(-6, -30), bf=(-22, 0)), None)],
    'crouch': [('01', P(p=(0, -52), n=(4, -94), h=(7, -104), fk=(16, -28), bk=(-12, -28)), None), ('last = crouch hold', CROUCH, None)],
    'jump': [('01 take-off', P(CROUCH, p=(0, -44), n=(4, -86), h=(6, -96), fh=(20, -112), bh=(12, -108)), None), ('02 rising (tucked)', AIR, None), ('03 falling (legs reach down)', P(AIR, fk=(12, -36), ff=(14, -8), bk=(-6, -36), bf=(-10, -6)), None)],
    'flip': [('tuck', AIR, None), ('quarter', rot(AIR, 90), None), ('upside down', rot(AIR, 180), None), ('three quarters', rot(AIR, 270), None)],
    'lp': [('wind-up', P(fe=(10, -86), fh=(18, -92)), None), ('IMPACT gut punch', P(n=(6, -104), h=(9, -114), fe=(32, -88), fh=(54, -86)), None), ('recover', P(fe=(18, -88), fh=(30, -94)), None)],
    'hp': [('wind-up', P(n=(0, -104), fe=(10, -94), fh=(16, -104)), None), ('IMPACT face punch', P(n=(8, -104), h=(12, -114), fe=(32, -102), fh=(56, -106), bf=(-20, 0)), None), ('recover', P(fe=(20, -96), fh=(32, -104)), None)],
    'cp': [('crouch hold', CROUCH, None), ('IMPACT', P(CROUCH, fe=(32, -64), fh=(54, -64), n=(10, -76), h=(13, -86)), None)],
    'uppercut': [('crouch', CROUCH, None), ('rising', P(p=(2, -50), n=(10, -90), h=(14, -100), fe=(22, -80), fh=(30, -100), fk=(18, -26), bk=(-10, -26)), None), ('IMPACT full extension', P(p=(4, -66), n=(6, -108), h=(4, -118), fe=(14, -126), fh=(18, -148), ff=(14, -4)), None)],
    'lk': [('chamber', P(fk=(22, -58), ff=(16, -30), n=(-2, -104), h=(0, -114)), None), ('IMPACT mid kick', P(p=(-4, -64), n=(-6, -104), h=(-4, -114), fk=(28, -60), ff=(60, -64), bf=(-14, 0)), None), ('re-chamber', P(fk=(22, -56), ff=(18, -30)), None)],
    'hk': [('chamber', P(fk=(22, -72), ff=(14, -46), n=(-4, -104), h=(-2, -114)), None), ('IMPACT high kick', P(p=(-6, -64), n=(-12, -102), h=(-12, -112), fk=(26, -82), ff=(58, -108), bf=(-12, 0)), None), ('re-chamber', P(fk=(22, -70), ff=(16, -44)), None)],
    'roundhouse': [('wind (turning away)', P(mirror(IDLE), ff=(16, 0), bf=(-16, 0)), None), ('IMPACT rear leg high', P(p=(-4, -64), n=(-14, -100), h=(-16, -110), bk=(24, -84), bf=(56, -108), fk=(-2, -32), ff=(-4, 0)), None), ('lands, back to stance', IDLE, None)],
    'ck': [('crouch hold', CROUCH, None), ('IMPACT low poke', P(CROUCH, fk=(32, -14), ff=(62, -6)), None)],
    'sweep': [('drop low', P(CROUCH, p=(-6, -30), bh=(-14, -2), be=(-6, -30)), None), ('IMPACT spinning leg sweep', P(CROUCH, p=(-10, -28), n=(-18, -64), h=(-22, -74), bh=(-22, -2), be=(-14, -32), fk=(26, -10), ff=(64, -4)), None)],
    'jp': [('air', AIR, None), ('IMPACT (held)', P(AIR, n=(6, -112), fe=(32, -98), fh=(54, -96)), None)],
    'jk': [('air', AIR, None), ('IMPACT (held)', P(AIR, fk=(28, -52), ff=(58, -40)), None)],
    'block': [('last frame held', P(fe=(18, -98), fh=(18, -122), be=(10, -94), bh=(22, -114), n=(0, -104), h=(0, -114)), None)],
    'cblock': [('last frame held', P(CROUCH, fe=(20, -70), fh=(20, -94), be=(12, -66), bh=(24, -88)), None)],
    'hitHigh': [('head snaps back', P(h=(-8, -112), n=(-6, -102), fe=(-2, -84), fh=(-14, -74), be=(-10, -82), bh=(-20, -70)), None), ('back to idle 01', IDLE, None)],
    'hitMid': [('doubles over', P(n=(8, -96), h=(14, -98), p=(-4, -60), fe=(16, -80), fh=(12, -70), be=(6, -78), bh=(4, -68)), None), ('back to idle 01', IDLE, None)],
    'hitCrouch': [('head back', P(CROUCH, h=(-4, -82), n=(-2, -74), fh=(8, -56), bh=(0, -54)), None), ('back to crouch hold', CROUCH, None)],
    'launched': [('lifted, arched back', rot(GRABBED, -30), None), ('last frame held while flying', rot(P(GRABBED, fk=(10, -34), ff=(20, -6)), -60), None)],
    'knockdown': [('feet taken out', rot(P(IDLE, fh=(-6, -116), bh=(-14, -112)), -35, (0, 0)), None), ('falling back', shift(rot(IDLE, -70, (0, 0)), 10, -10), None), ('hits floor, ends over pivot', LIE, None)],
    'lie': [('flat on back, held', LIE, None)],
    'getup': [('from lie', LIE, None), ('kneel', KNEEL, None), ('last = idle 01', IDLE, None)],
    'ko': [('knees buckle', P(KNEEL, h=(4, -78), n=(2, -70), fh=(8, -30), bh=(-2, -30), bk=(-12, -4), bf=(-30, 0)), None), ('last frame held', P(LIE, h=(-62, -8)), None)],
    'dizzy': [('sway back', P(h=(-6, -113), n=(-4, -103), fe=(0, -112), fh=(0, -122), bh=(0, -70)), None), ('sway forward', P(h=(10, -112), n=(8, -102), fh=(10, -70), bh=(2, -70)), None)],
    'victory': [('pose, last frame held', P(fe=(14, -122), fh=(18, -142), be=(-8, -122), bh=(-12, -142)), None)],
    'intro': [('anything in character...', P(fe=(16, -104), fh=(30, -116)), None), ('last = idle 01', IDLE, None)],
}

# Universal throw: thrower frames with the victim ghost (mirrored: it faces the thrower).
THROWN = [GRABBED, rot(GRABBED, 35), rot(P(GRABBED, fk=(16, -40), ff=(24, -12)), 90), rot(P(GRABBED, fk=(16, -40), ff=(24, -12)), 150)]


def hipped(pose):
    """Place a thrown pose so its hips sit 250 px above its pivot."""
    hx, hy = pose['p']
    return shift(pose, -hx, -62.5 - hy)


A['throw'] = [
    ('01 reach', P(n=(6, -104), h=(9, -114), fe=(30, -94), fh=(44, -98), be=(20, -92), bh=(38, -100)), []),
    ('02 grab (partner frame 1)', P(fe=(24, -100), fh=(34, -110), be=(16, -98), bh=(30, -108)), [(hipped(THROWN[0]), THROW_PATH[0])]),
    ('03 lift (partner 2)', P(p=(0, -58), n=(-2, -100), h=(-2, -110), fe=(16, -114), fh=(22, -130), be=(10, -112), bh=(16, -128), fk=(14, -30), bk=(-12, -30)), [(hipped(THROWN[1]), THROW_PATH[1])]),
    ('04 overhead (partner 3)', P(n=(-6, -103), h=(-6, -113), fe=(2, -124), fh=(2, -144), be=(-6, -122), bh=(-6, -142)), [(hipped(THROWN[2]), THROW_PATH[2])]),
    ('05 toss behind (partner 4)', P(n=(-12, -101), h=(-14, -110), fe=(-16, -118), fh=(-30, -132), be=(-20, -116), bh=(-34, -128), bf=(-20, 0)), [(hipped(THROWN[3]), THROW_PATH[3]), (LIE, LAND)]),
]
A['thrown'] = [(f'{i + 1:02d}' + (' grabbed', ' lifted', ' overhead, face down', ' head down, falling')[i], hipped(t), None) for i, t in enumerate(THROWN)]


def font(sz):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_pose(d, pose, ox, oy, k, faded=False, flip=False):
    def pt(name):
        x, y = pose[name]
        x = -x if flip else x
        return ox + x * S * k, oy + y * S * k
    w = max(2, round(26 * k))
    col = lambda c: GHOST if faded else c
    order = [('bk', 'p', 'bk', 'bf', REAR), ('be', 'n', 'be', 'bh', REAR), (None, 'p', 'n', None, BODY),
             ('fk', 'p', 'fk', 'ff', LEAD), ('fe', 'n', 'fe', 'fh', LEAD)]
    for _, a, b, c, colr in order:
        d.line([pt(a), pt(b)], fill=col(colr), width=w if colr != BODY else w * 2)
        if c:
            d.line([pt(b), pt(c)], fill=col(colr), width=w)
    hx, hy = pt('h')
    r = 12 * S * k
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=col(BODY))
    # nose shows facing
    d.ellipse([hx + (-r if flip else r) - 6 * k * S / 4, hy - 6 * k, hx + (-r if flip else r) + 6 * k * S / 4, hy + 6 * k], fill=col(LEAD))


def board(anim, frames):
    k = CELL / CANVAS
    big = anim == 'throw'
    cw = CELL * 2 if big else CELL
    ox_off = CELL // 2 if big else 0
    img = Image.new('RGB', (cw * len(frames), CELL + 60), (250, 250, 248))
    d = ImageDraw.Draw(img)
    f1, f2 = font(22), font(15)
    for i, (label, pose, extras) in enumerate(frames):
        x0 = i * cw
        d.rectangle([x0 + ox_off, 40, x0 + ox_off + CELL - 1, 40 + CELL - 1], outline=(200, 200, 200))
        px, py = x0 + ox_off + PX * k, 40 + PY * k
        top = py - 500 * k
        d.line([x0, top, x0 + cw, top], fill=(120, 200, 120), width=1)
        d.line([x0, py, x0 + cw, py], fill=(200, 200, 200), width=1)
        for g, (dx, dy) in extras or []:
            draw_pose(d, g, px + dx * k, py + dy * k, k, faded=True, flip=True)
        draw_pose(d, pose, px, py, k)
        d.line([px - 10, py, px + 10, py], fill=(220, 0, 0), width=2)
        d.line([px, py - 10, px, py + 10], fill=(220, 0, 0), width=2)
        d.text((x0 + 8, 46), label, fill=(30, 30, 30), font=f2)
    d.text((8, 8), anim, fill=(0, 0, 0), font=f1)
    d.text((8, CELL + 44), 'red cross = pivot (384,736)   green line = 500 px standing height   orange = lead limbs, blue = rear', fill=(90, 90, 90), font=font(12))
    return img


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for anim, frames in A.items():
        board(anim, frames).save(OUT / f'{anim}.png', optimize=True)
    print(f'{len(A)} boards in {OUT}')
