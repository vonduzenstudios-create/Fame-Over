#!/usr/bin/env python3
"""Draw the pose reference boards in docs/poses/: one PNG per animation showing every frame, posed on a
jointed mannequin with real proportions on the 768x768 canvas (pivot cross at 384,736, 500 px line).

The boards say what each animation must *do* for the engine: where the body is, what reaches where,
which frame is the impact, how it starts and ends, and how many frames it has. They are not a style,
anatomy or personality reference; each character's brief decides that. Lead limbs (nearer the
opponent) are orange, rear limbs blue. Usage: python3 scripts/pose_boards.py   (needs Pillow)
"""
import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

OUT = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'poses'
CANVAS, PX, PY = 768, 384, 736
CELL = 256                      # each frame drawn at a third of its real size
SS = 2                          # supersampling for smooth edges

# Body lengths in final pixels: soles to top of head = 500.
SHIN, THIGH, SPINE, NECK, HEAD_R, UPPER, FORE = 122, 120, 158, 34, 40, 88, 84
SHOULDER_DROP = 18              # shoulder sits this far down the spine from the neck

LEAD, LEAD_D = (240, 140, 60), (150, 70, 20)
REAR, REAR_D = (90, 140, 225), (30, 60, 130)
BODY, BODY_D = (120, 122, 135), (45, 45, 55)
SKIN, GHOST = (235, 200, 165), (205, 205, 212)


def vec(a, length):
    """Absolute limb angle: 0 = straight down, 90 = forward (screen right), 180 = up, -90 = back."""
    r = math.radians(a)
    return math.sin(r) * length, math.cos(r) * length


def P(base=None, **kw):
    """A pose. t: torso lean (0 upright, + forward), hd: head tilt (+ chin down), arms/legs as
    (upper, lower) absolute angles. hy: hip height (negative, used for airborne poses), hx: hip x.
    plant: 'mid' | 'rear' | 'lead' | 'hip' | None (grounded poses put the lowest foot on the floor and pin
    that point to the pivot's x). rot: whole-body rotation about the hips (+ = forward/clockwise)."""
    out = dict(base) if base else dict(t=8, hd=0, la=(40, 150), ra=(25, 165), ll=(24, 4), rl=(-8, -28), hx=0, hy=-250, plant='mid', rot=0)
    out.update(kw)
    return out


def joints(p):
    hip = (0.0, 0.0)
    tx, ty = math.sin(math.radians(p['t'])) * SPINE, -math.cos(math.radians(p['t'])) * SPINE
    neck = (hip[0] + tx, hip[1] + ty)
    sh = (neck[0] - tx * SHOULDER_DROP / SPINE, neck[1] - ty * SHOULDER_DROP / SPINE)
    ha = p['t'] + p['hd']
    head = (neck[0] + math.sin(math.radians(ha)) * (NECK + HEAD_R * 0.6), neck[1] - math.cos(math.radians(ha)) * (NECK + HEAD_R * 0.6))
    j = {'hip': hip, 'neck': neck, 'sh': sh, 'head': head, 'ha': ha}
    for side in 'lr':
        ua, fa = p[side + 'a']
        e = (sh[0] + vec(ua, UPPER)[0], sh[1] + vec(ua, UPPER)[1])
        j[side + 'e'] = e
        j[side + 'h'] = (e[0] + vec(fa, FORE)[0], e[1] + vec(fa, FORE)[1])
        ta, sa = p[side + 'l']
        k = (vec(ta, THIGH)[0], vec(ta, THIGH)[1])
        j[side + 'k'] = k
        j[side + 'f'] = (k[0] + vec(sa, SHIN)[0], k[1] + vec(sa, SHIN)[1])
        j[side + 'sa'] = sa
    if p['rot']:
        r = math.radians(p['rot'])
        c, s = math.cos(r), math.sin(r)
        for key, v in list(j.items()):
            if isinstance(v, tuple):
                j[key] = (v[0] * c - v[1] * s, v[0] * s + v[1] * c)
        j['ha'] += p['rot']
        j['lsa'] += p['rot']
        j['rsa'] += p['rot']
    # place the body relative to the pivot
    if p['plant']:
        low = max(j['lf'][1], j['rf'][1], j['lk'][1] + 18, j['rk'][1] + 18, j['head'][1] + HEAD_R, j['lh'][1], j['rh'][1], j['hip'][1] + 30)
        dy = -low
        if p['plant'] == 'mid':
            dx = -(j['lf'][0] + j['rf'][0]) / 2
        elif p['plant'] == 'hip':
            dx = -j['hip'][0]
        elif p['plant'] == 'rear':
            dx = -j['rf'][0] - 52
        else:
            dx = -j['lf'][0] + 48
        dx += p['hx']
    else:
        dx, dy = p['hx'], p['hy']
    for key, v in list(j.items()):
        if isinstance(v, tuple):
            j[key] = (v[0] + dx, v[1] + dy)
    return j


def lerp(a, b, u):
    out = {}
    for k in a:
        va, vb = a[k], b[k]
        if isinstance(va, tuple):
            out[k] = tuple(x + (y - x) * u for x, y in zip(va, vb))
        elif isinstance(va, (int, float)) and isinstance(vb, (int, float)):
            out[k] = va + (vb - va) * u
        else:
            out[k] = va if u < 0.5 else vb
    return out


def seq(n, keys, loop=False):
    """n frames from keyframes {frame index: pose}; in-betweens eased."""
    idx = sorted(keys)
    if loop:
        keys = dict(keys)
        keys[n] = keys[idx[0]]
        idx = sorted(keys)
    out = []
    for f in range(n):
        if f in keys:
            out.append(keys[f])
            continue
        a = max(i for i in idx if i < f)
        b = min(i for i in idx if i > f)
        u = (f - a) / (b - a)
        u = u * u * (3 - 2 * u)
        out.append(lerp(keys[a], keys[b], u))
    return out


# ---- the poses ----
IDLE = P()
BREATHE = P(t=11, hd=4, la=(44, 146), ra=(28, 160), ll=(28, 0), rl=(-4, -32))
CROUCH = P(t=28, hd=-18, la=(70, 165), ra=(50, 172), ll=(82, -8), rl=(62, -46))
AIR = P(plant=None, hy=-330, t=10, la=(60, 160), ra=(40, 170), ll=(112, 6), rl=(92, -8))
STRAIGHT = P(t=0, hd=0, la=(10, 5), ra=(-10, -5), ll=(4, 2), rl=(-4, -2))
LIE = dict(STRAIGHT, rot=-90, hd=-10, la=(-30, -40), ra=(-10, -20), ll=(12, -6), rl=(22, -2), plant='hip', hx=-20)
KNEEL = P(t=20, hd=-5, la=(60, 120), ra=(30, 90), ll=(80, 2), rl=(10, -90))
SIT = P(t=-35, hd=10, la=(-30, -20), ra=(-50, -40), ll=(80, 30), rl=(85, 20), plant='hip', hx=-60)
GRABBED = P(t=-6, hd=-15, la=(150, 175), ra=(130, 170), ll=(10, 0), rl=(-6, -4))
GRAB_AIR = dict(GRABBED, plant=None, hy=-300)

A = {}   # id: (frames, impact frame or None, note, extras {frame: [(pose, (dx, dy))]})


def add(name, frames, impact=None, note='', partner=None):
    A[name] = (frames, impact, note, partner or {})


add('idle', seq(8, {0: IDLE, 4: BREATHE}, loop=True), note='seamless loop: frame 8 flows into frame 1')
add('turn', [dict(IDLE, mirror=True), P(t=0, la=(30, 160), ra=(-30, -160), ll=(6, 0), rl=(-6, 0)), IDLE],
    note='starts facing away (mirrored), ends on idle 01; the engine flips the side on frame 1')
W1 = P(ll=(30, 14), rl=(-26, -20), t=10)
W2 = P(ll=(4, 0), rl=(30, -40), t=9)
W3 = P(ll=(-26, -20), rl=(30, 14), t=10)
W4 = P(ll=(30, -40), rl=(4, 0), t=9)
add('walk', seq(9, {0: W1, 2: W2, 4: W3, 7: W4}, loop=True), note='walks in place, no travel; walking back plays it reversed')
add('crouch', seq(3, {0: IDLE, 2: CROUCH}), note='last frame is the crouch hold')
add('jump', [P(CROUCH, t=15, la=(80, 170), ra=(70, 175), ll=(70, -10), rl=(50, -40)), AIR,
             P(AIR, ll=(36, 14), rl=(-6, -10), la=(50, 160))],
    note='take-off, rising (tucked), falling (legs reaching down); stays in place, the engine adds height')
add('flip', [dict(AIR, rot=a) for a in range(0, 360, 45)], note='forward somersault, tucked, rotating about the hips')
LP_W = P(t=6, la=(30, 160), ra=(25, 165))
LP_I = P(t=16, la=(80, 86), ra=(18, 160), ll=(26, 4), rl=(-14, -26))
add('lp', seq(5, {0: IDLE, 1: LP_W, 2: LP_I, 4: IDLE}), 2, 'quick gut punch with the lead hand')
HP_W = P(t=4, ra=(10, 150), la=(50, 160))
HP_I = P(t=20, hd=2, ra=(95, 98), la=(30, 170), ll=(28, 6), rl=(-20, -16))
add('hp', seq(5, {0: IDLE, 1: HP_W, 2: HP_I, 4: IDLE}), 2, 'rear-hand cross to the face')
add('cp', seq(4, {0: CROUCH, 1: P(CROUCH, la=(50, 150)), 2: P(CROUCH, t=32, la=(85, 88)), 3: CROUCH}), 2, 'punch from the crouch hold')
UP_L = P(CROUCH, t=34, ra=(-30, 20), la=(60, 160))
UP_R = P(t=20, hd=-10, ra=(70, 150), la=(40, 165), ll=(40, 0), rl=(-6, -30))
UP_I = P(t=-4, hd=-14, ra=(170, 178), la=(20, 120), ll=(10, 2), rl=(-14, -18))
add('uppercut', seq(6, {0: CROUCH, 1: UP_L, 2: UP_R, 3: UP_I, 5: P(UP_I, ra=(150, 170))}), 3, 'from the crouch, rising to full stretch; launches the opponent')
LK_C = P(t=0, ll=(90, -10), la=(50, 160), plant='rear')
LK_I = P(t=-14, hd=10, ll=(88, 90), la=(40, 165), ra=(-10, 150), plant='rear')
add('lk', seq(5, {0: IDLE, 1: LK_C, 2: LK_I, 3: LK_C, 4: IDLE}), 2, 'lead-leg kick to the stomach')
HK_C = P(t=-6, ll=(115, 10), la=(50, 165), plant='rear')
HK_I = P(t=-28, hd=18, ll=(122, 120), la=(30, 160), ra=(-30, 140), plant='rear')
add('hk', seq(5, {0: IDLE, 1: HK_C, 2: HK_I, 3: HK_C, 4: IDLE}), 2, 'high kick to the head (the chef swaps this for a rolling-pin chop)')
RH_1 = P(t=4, rl=(30, -10), ll=(10, 0), la=(30, 120), ra=(10, 100), plant='lead')
RH_2 = P(t=-20, rl=(100, 40), ll=(6, 0), la=(-20, 60), ra=(-40, 40), plant='lead')
RH_I = P(t=-34, hd=20, rl=(124, 118), ll=(4, 0), la=(-10, 40), ra=(-50, 30), plant='lead')
add('roundhouse', seq(8, {0: IDLE, 2: RH_1, 3: RH_2, 4: RH_I, 6: P(RH_2, rl=(60, -20)), 7: IDLE}), 4,
    'spinning: the body turns away from the opponent, then the rear leg whips round high; knocks down')
add('ck', seq(5, {0: CROUCH, 1: P(CROUCH, ll=(100, 10)), 2: P(CROUCH, t=12, ll=(86, 88)), 3: P(CROUCH, ll=(100, 10)), 4: CROUCH}), 2, 'low poke kick from the crouch')
SW_D = P(t=40, hd=-25, ra=(-25, -20), la=(80, 160), ll=(70, -20), rl=(60, -80))
SW_I = P(t=45, hd=-25, ra=(-30, -25), la=(90, 160), ll=(86, 92), rl=(60, -84))
add('sweep', seq(8, {0: CROUCH, 2: SW_D, 3: P(SW_D, ll=(80, 50)), 4: SW_I, 6: P(SW_I, ll=(70, 20)), 7: CROUCH}), 4,
    'drops low with a hand on the floor and sweeps the lead leg along the floor; knocks down')
add('jp', [AIR, P(AIR, t=16, la=(70, 120)), P(AIR, t=20, la=(80, 82))], 2, 'air punch, last frame held until landing')
add('jk', [AIR, P(AIR, ll=(70, 40)), P(AIR, t=-8, ll=(70, 72), rl=(100, -10))], 2, 'air kick, last frame held until landing')
BL = P(t=2, hd=8, la=(30, 178), ra=(55, 172))
add('block', seq(3, {0: IDLE, 2: BL}), note='last frame held')
CB = P(CROUCH, hd=5, la=(40, 178), ra=(65, 172))
add('cblock', seq(3, {0: CROUCH, 2: CB}), note='last frame held')
HH = P(t=-18, hd=-28, la=(-30, 20), ra=(-50, -10), ll=(30, 4), rl=(-14, -20))
add('hitHigh', [HH, P(t=-8, hd=-12, la=(10, 100), ra=(-10, 80)), IDLE], note='head snaps back, then returns to idle 01')
HM = P(t=38, hd=18, la=(50, 110), ra=(35, 95), ll=(20, 0), rl=(-14, -24))
add('hitMid', [HM, P(t=22, hd=8, la=(45, 140), ra=(30, 130)), IDLE], note='doubles over, then returns to idle 01')
HC = P(CROUCH, t=8, hd=-28, la=(30, 60), ra=(10, 40))
add('hitCrouch', [HC, P(CROUCH, t=18, hd=-10), CROUCH], note='returns to the crouch hold')
LA = dict(GRAB_AIR, t=-20, hd=-25, la=(-60, -40), ra=(-80, -60), ll=(30, 10), rl=(14, -5))
add('launched', [dict(LA, rot=r) for r in (-10, -30, -50, -65)], note='knocked into the air, arched; last frame held while flying (the engine moves it)')
KD = dict(STRAIGHT, plant='hip', t=-10, hd=-20, la=(-40, -20), ra=(-70, -50))
add('knockdown', [dict(KD, rot=-25, ll=(30, 20), rl=(20, 10)), dict(KD, rot=-50, ll=(50, 40), rl=(40, 30), hx=-10),
                  dict(KD, rot=-75, ll=(40, 20), rl=(30, 10), hx=-20), LIE],
    note='feet taken out, falls on the back; ends lying over the pivot')
add('lie', [LIE], note='flat on the back, head away from the opponent; held')
add('getup', seq(5, {0: LIE, 1: SIT, 2: KNEEL, 3: P(t=18, ll=(30, 0), rl=(-10, -40), la=(50, 140)), 4: IDLE}), note='last frame is idle 01')
KO1 = P(t=-14, hd=-20, la=(10, 30), ra=(-20, 0))
KO2 = P(t=10, hd=30, la=(5, 0), ra=(-5, -5), ll=(60, -20), rl=(40, -50))
add('ko', seq(7, {0: KO1, 2: KO2, 3: KNEEL, 4: dict(KNEEL, rot=-30), 5: dict(KD, rot=-70, hx=-20), 6: LIE}),
    note='staggers, knees buckle, collapses onto the back; last frame held')
DZ1 = P(t=-6, hd=-20, la=(10, 120), ra=(-10, 160), ll=(18, 4), rl=(-12, -20))
DZ2 = P(t=18, hd=25, la=(20, 10), ra=(0, 0), ll=(30, 0), rl=(-6, -30))
add('dizzy', seq(8, {0: DZ1, 4: DZ2}, loop=True), note='stunned sway, seamless loop (the brief adds the character touches)')
VI = P(t=-4, hd=-15, la=(160, 175), ra=(170, 178), ll=(14, 2), rl=(-12, -6))
add('victory', seq(10, {0: IDLE, 3: P(t=0, la=(90, 150), ra=(80, 160)), 6: VI, 9: VI}), note='the pose is the brief\'s; last frame held')
RELAX = P(t=2, la=(5, 10), ra=(-5, 0), ll=(8, 2), rl=(-8, -4))
add('intro', seq(8, {0: RELAX, 3: P(t=4, la=(60, 120), ra=(10, 30)), 5: P(t=10, la=(50, 160), ra=(30, 120)), 7: IDLE}),
    note='the entrance is the brief\'s; it must end on idle 01')

# The universal throw. Victim pivot offsets (px) relative to the thrower's pivot, thrower facing
# right; thrown frames hang from the hips, which sit 300 px above the victim's pivot.
THROW_PATH = [(170, 50), (110, -110), (10, -340), (-170, -200)]
LAND = (-250, 0)
TH = [GRAB_AIR, dict(GRAB_AIR, rot=35), dict(GRAB_AIR, rot=90, ll=(40, 30), rl=(30, 20)),
      dict(GRAB_AIR, rot=150, ll=(40, 30), rl=(20, 10))]
T1 = P(t=22, la=(85, 100), ra=(75, 105))
T2 = P(t=14, la=(85, 150), ra=(70, 155))
T3 = P(t=-4, hd=-10, la=(130, 175), ra=(120, 175), ll=(30, 0), rl=(-6, -30))
T4 = P(t=-10, hd=-20, la=(170, 180), ra=(165, 180), ll=(24, 0), rl=(-10, -20))
T5 = P(t=-26, hd=-25, la=(-150, -140), ra=(-140, -130), ll=(30, 6), rl=(-14, -14))
add('throw', [T1, T2, T3, T4, T5], None,
    'reach, grab, lift, overhead, toss: the victim goes over the top and lands behind (sides swap)',
    {1: [(TH[0], THROW_PATH[0])], 2: [(TH[1], THROW_PATH[1])], 3: [(TH[2], THROW_PATH[2])], 4: [(TH[3], THROW_PATH[3]), (LIE, LAND, False)]})
add('thrown', TH, None, 'plays with throw frames 2-5; hips stay 300 px above the pivot (the body rotates around them)')


# ---- drawing ----
def font(sz):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def capsule(d, a, b, r, fill, edge, k):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    ln = math.hypot(dx, dy) or 1
    nx, ny = -dy / ln * r, dx / ln * r
    o = max(1, k * 2.4)
    for rr, col in ((r + o, edge), (r, fill)):
        nx, ny = -dy / ln * rr, dx / ln * rr
        d.polygon([(ax + nx, ay + ny), (bx + nx, by + ny), (bx - nx, by - ny), (ax - nx, ay - ny)], fill=col)
        d.ellipse([ax - rr, ay - rr, ax + rr, ay + rr], fill=col)
        d.ellipse([bx - rr, by - rr, bx + rr, by + rr], fill=col)


def draw_figure(d, p, ox, oy, k, ghost=False, flip=False):
    """Draw pose p with its pivot at (ox, oy), scale k (screen px per final px)."""
    j = joints(p)
    flip = flip ^ bool(p.get('mirror'))
    s = -1 if flip else 1
    T = lambda v: (ox + v[0] * s * k, oy + v[1] * k)
    col = (lambda c, e: (GHOST, (150, 150, 160))) if ghost else (lambda c, e: (c, e))
    def limb(side, c, e):
        f, ed = col(c, e)
        capsule(d, T(j['hip']), T(j[side + 'k']), 19 * k, f, ed, k)
        capsule(d, T(j[side + 'k']), T(j[side + 'f']), 16 * k, f, ed, k)
        # foot: points forward from the ankle
        toe = (j[side + 'f'][0] + math.cos(math.radians(j[side + 'sa'])) * 34, j[side + 'f'][1] - math.sin(math.radians(j[side + 'sa'])) * 34)
        capsule(d, T(j[side + 'f']), T(toe), 11 * k, f, ed, k)
    def arm(side, c, e):
        f, ed = col(c, e)
        capsule(d, T(j['sh']), T(j[side + 'e']), 15 * k, f, ed, k)
        capsule(d, T(j[side + 'e']), T(j[side + 'h']), 13 * k, f, ed, k)
        hx, hy = T(j[side + 'h'])
        r = 17 * k
        d.ellipse([hx - r - 2 * k, hy - r - 2 * k, hx + r + 2 * k, hy + r + 2 * k], fill=ed)
        d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=SKIN if not ghost else f)
    arm('r', REAR, REAR_D)
    limb('r', REAR, REAR_D)
    bf, be = col(BODY, BODY_D)
    capsule(d, T(j['hip']), T(j['neck']), 34 * k, bf, be, k)
    capsule(d, T(j['hip']), T(j['hip']), 30 * k, bf, be, k)
    capsule(d, T(j['neck']), T(j['head']), 12 * k, SKIN if not ghost else bf, be, k)
    hx, hy = T(j['head'])
    r = HEAD_R * k
    d.ellipse([hx - r - 2 * k, hy - r - 2 * k, hx + r + 2 * k, hy + r + 2 * k], fill=be)
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=SKIN if not ghost else bf)
    # face: nose and eye show which way the head points
    ha = math.radians(j['ha'])
    fx, fy = math.cos(ha) * s, math.sin(ha)          # forward direction of the face
    ux, uy = math.sin(ha) * s, -math.cos(ha)         # up direction of the head
    nose = [(hx + fx * r * 0.85 + ux * r * 0.1, hy + fy * r * 0.85 + uy * r * 0.1), (hx + fx * r * 1.25 - ux * r * 0.05, hy + fy * r * 1.25 - uy * r * 0.05), (hx + fx * r * 0.85 - ux * r * 0.3, hy + fy * r * 0.85 - uy * r * 0.3)]
    d.polygon(nose, fill=be)
    ex, ey = hx + fx * r * 0.5 + ux * r * 0.2, hy + fy * r * 0.5 + uy * r * 0.2
    d.ellipse([ex - 4 * k, ey - 4 * k, ex + 4 * k, ey + 4 * k], fill=be)
    limb('l', LEAD, LEAD_D)
    arm('l', LEAD, LEAD_D)


def board(name, frames, impact, note, partner):
    big = name == 'throw'
    cw = CELL * 2 if big else CELL
    per_row = 5 if big else 8
    n = len(frames) + (0 if big or len(frames) < 3 else 1)   # + onion-skin summary cell
    rows = (n + per_row - 1) // per_row
    W, H = max(3 * CELL, min(n, per_row) * cw), 70 + rows * (CELL + 30) + 30
    img = Image.new('RGB', (W * SS, H * SS), (250, 250, 247))
    d = ImageDraw.Draw(img)
    k = CELL / CANVAS * SS
    f_t, f_s, f_l = font(26 * SS), font(14 * SS), font(15 * SS)
    d.text((10 * SS, 8 * SS), f'{name}  ({len(frames)} frames)', fill=(20, 20, 20), font=f_t)
    d.text((10 * SS, 42 * SS), note, fill=(70, 70, 70), font=f_s)
    cells = list(enumerate(frames))
    if n > len(frames):
        cells.append(('all', None))
    for ci, (fi, pose) in enumerate(cells):
        r, c = divmod(ci, per_row)
        x0, y0 = c * cw * SS, (70 + r * (CELL + 30)) * SS
        cx0 = x0 + (CELL // 2 * SS if big else 0)
        d.rectangle([cx0, y0, cx0 + CELL * SS - 1, y0 + CELL * SS - 1], fill=(255, 255, 255), outline=(215, 215, 215), width=SS)
        px, py = cx0 + PX * k, y0 + PY * k
        d.line([x0, y0 + (PY - 500) * k, x0 + cw * SS, y0 + (PY - 500) * k], fill=(150, 210, 150), width=SS)
        d.line([x0, py, x0 + cw * SS, py], fill=(185, 185, 185), width=SS)
        if pose is None:
            for g in frames:
                draw_figure(d, g, px, py, k, ghost=True)
            draw_figure(d, frames[impact if impact is not None else -1], px, py, k)
            label = 'all frames' + (' + impact' if impact is not None else '')
        else:
            for g, (dx, dy), *fl in partner.get(fi, []):
                draw_figure(d, g, px + dx * k, py + dy * k, k, ghost=True, flip=fl[0] if fl else True)
            draw_figure(d, pose, px, py, k)
            label = f'{fi + 1:02d}'
        d.line([px - 9 * SS, py, px + 9 * SS, py], fill=(220, 30, 30), width=2 * SS)
        d.line([px, py - 9 * SS, px, py + 9 * SS], fill=(220, 30, 30), width=2 * SS)
        d.text((x0 + 6 * SS, y0 + 4 * SS), label, fill=(30, 30, 30), font=f_l)
        if pose is not None and fi == impact:
            d.text((x0 + 40 * SS, y0 + 4 * SS), 'IMPACT', fill=(210, 30, 30), font=f_l)
    d.text((10 * SS, (H - 24) * SS), 'red cross = pivot (384,736)   green = 500 px standing height   grey line = floor   orange = lead limbs, blue = rear   grey figure = opponent',
           fill=(110, 110, 110), font=font(11 * SS))
    return img.resize((W, H), Image.LANCZOS)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.png'):
        old.unlink()
    for name, (frames, impact, note, partner) in A.items():
        board(name, frames, impact, note, partner).save(OUT / f'{name}.png', optimize=True)
    print(f'{len(A)} boards in {OUT}')
