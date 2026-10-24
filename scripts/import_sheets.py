#!/usr/bin/env python3
"""Turn a folder of fighter frames into one packed sprite sheet the game loads.

Input: an art folder laid out as frames/<animation>/<nn>.png (e.g. frames/lp/02.png), one
transparent PNG per frame, the fighter facing right (docs/ART_SPEC.md). Output: sheet pages
(sheet-0.webp, sheet-1.webp, ... up to 4096x4096 each) + sheet.json in --out, with every frame keyed
"<animation>/<nn>" (the names the fighter's tags use, see src/fighters/<id>/fighter.ts).

For each frame the script works out a starting point you then check in the sprite viewer
(open the game with ?viewer):
  - the feet anchor: the fixed pivot (384,736 on the standard 768x768 canvas, see docs/ART_SPEC.md),
    or for other canvases the bottom of the figure, centred on the pixels of the lowest rows;
  - hurtboxes: head, body and legs bands of the figure (one box for a figure lying down);
  - a hitbox wherever a limb reaches well in front of the body (only used on a move's active frames).

Anything the guesses get wrong goes in <art>/overrides.json, which wins over the guesses:
  { "punch/03": { "ax": 30, "ay": 131, "hit": [40, -100, 20, 12], "hurt": [[-10, -128, 22, 22]] } }
Box numbers are [x, y, w, h] relative to the feet anchor, y negative upwards.

Usage: python3 scripts/import_sheets.py "C:/path/to/GordonRamsay" --out public/fighters/ramsay [--scale 1]
Needs Pillow (pip install pillow).
"""
import argparse
import json
import pathlib
import sys

from PIL import Image

PAD = 2
PAGE = 4096
# Sizes for ~500 px tall fighters: body width, how far in front counts as reaching, hitbox depth.
TORSO, REACH, TIP = 160, 120, 64


def opaque_rows(im, x0, x1, y0, y1):
    """For each row y in [y0, y1): (min x, max x) of opaque pixels, or None."""
    px = im.load()
    out = {}
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if px[x, y][3] > 128]
        out[y] = (xs[0], xs[-1]) if xs else None
    return out


def band_box(rows, y0, y1, ax, ay):
    spans = [rows[y] for y in range(y0, y1) if rows.get(y)]
    if not spans:
        return None
    lo, hi = min(s[0] for s in spans), max(s[1] for s in spans)
    return [lo - ax, y0 - ay, hi - lo + 1, y1 - y0]


def analyse(im, pivot=None):
    bbox = im.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
    if not bbox:
        return None
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    rows = opaque_rows(im, x0, x1, y0, y1)
    # feet anchor: centre of what's in the lowest 6 rows
    feet = [rows[y] for y in range(max(y0, y1 - 24), y1) if rows.get(y)]
    ax = round((min(s[0] for s in feet) + max(s[1] for s in feet)) / 2)
    ay = y1
    if pivot:
        ax, ay = pivot
    if w > h * 1.15:  # lying down
        hurt = [[x0 - ax, y0 - ay, w, h]]
    else:
        head_end = y0 + round(h * 0.18)
        body_end = y0 + round(h * 0.58)
        hurt = [b for b in (band_box(rows, y0, head_end, ax, ay), band_box(rows, head_end, body_end, ax, ay), band_box(rows, body_end, y1, ax, ay)) if b]
        # keep boxes to about torso width around the feet; reaching limbs are the hitbox's job
        for b in hurt:
            if b[2] > TORSO:
                b[0], b[2] = -TORSO // 2, TORSO
    # hitbox: the front-most part of anything reaching well in front of the feet
    hit = None
    reach = [(y, s[1]) for y, s in rows.items() if s and s[1] - ax > REACH]
    if reach:
        far = max(r[1] for r in reach)
        ys = [y for y, x in reach if x >= far - TIP]
        hit = [far - TIP - ax, min(ys) - ay, TIP + 1, max(ys) - min(ys) + 1]
    return {'crop': bbox, 'ax': ax - x0, 'ay': ay - y0, 'hurt': hurt, 'hit': hit}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('art', help='art folder containing frames/<section>/<name>.png')
    ap.add_argument('--out', required=True, help='where to write sheet.png and sheet.json')
    ap.add_argument('--scale', type=float, default=1.0, help='resize frames first (nearest neighbour)')
    ap.add_argument('--format', choices=('webp', 'png'), default='webp', help='sheet page format (webp is ~5x smaller)')
    ap.add_argument('--pivot', default=None, help='feet anchor "x,y" on every frame (default: 384,736 for 768x768 frames, else guessed)')
    a = ap.parse_args()

    art = pathlib.Path(a.art)
    files = sorted((art / 'frames').glob('*/*.png'))
    if not files:
        sys.exit(f'no frames found under {art / "frames"}')
    overrides = {}
    if (art / 'overrides.json').exists():
        overrides = json.loads((art / 'overrides.json').read_text())

    items = []
    for f in files:
        name = f'{f.parent.name}/{f.stem}'
        im = Image.open(f).convert('RGBA')
        if a.scale != 1:
            im = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.NEAREST)
        pivot = tuple(int(v) for v in a.pivot.split(',')) if a.pivot else (384, 736) if im.size == (768, 768) else None
        info = analyse(im, pivot)
        if not info:
            print(f'skipping empty frame {name}')
            continue
        items.append((name, im.crop(info['crop']), info))

    # shelf packing into 4096x4096 pages, tallest first
    order = sorted(items, key=lambda it: -it[1].height)
    pages = [[]]  # per page: (name, x, y)
    x = y = shelf = 0
    placed = {}
    for name, im, info in order:
        if x + im.width > PAGE:
            x, y, shelf = 0, y + shelf + PAD, 0
        if y + im.height > PAGE:
            pages.append([])
            x = y = shelf = 0
        placed[name] = (len(pages) - 1, x, y)
        x += im.width + PAD
        shelf = max(shelf, im.height)
    by_name = {name: (im, info) for name, im, info in items}
    sheets = []
    for p in range(len(pages)):
        names = [n for n, v in placed.items() if v[0] == p]
        w = max(placed[n][1] + by_name[n][0].width for n in names)
        h = max(placed[n][2] + by_name[n][0].height for n in names)
        sheets.append(Image.new('RGBA', (w, h)))

    frames = {}
    for name, im, info in items:
        page, px, py = placed[name]
        sheets[page].paste(im, (px, py))
        fr = {'page': page, 'x': px, 'y': py, 'w': im.width, 'h': im.height, 'ax': info['ax'], 'ay': info['ay'],
              'hurt': [dict(zip('xywh', b)) for b in info['hurt']]}
        if info['hit']:
            fr['hit'] = dict(zip('xywh', info['hit']))
        o = overrides.get(name, {})
        for k in ('ax', 'ay'):
            if k in o:
                fr[k] = o[k]
        if 'hurt' in o:
            fr['hurt'] = [dict(zip('xywh', b)) for b in o['hurt']]
        if 'hit' in o:
            if o['hit']:
                fr['hit'] = dict(zip('xywh', o['hit']))
            else:
                fr.pop('hit', None)
        frames[name] = fr

    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    images = []
    for old in list(out.glob('sheet-*.png')) + list(out.glob('sheet-*.webp')):
        old.unlink()
    for i, sh in enumerate(sheets):
        name = f'sheet-{i}.{a.format}'
        if a.format == 'webp':
            sh.save(out / name, quality=90, alpha_quality=100, method=6)
        else:
            sh.save(out / name, optimize=True)
        images.append(name)
    (out / 'sheet.json').write_text(json.dumps({'images': images, 'frames': frames}, indent=1, sort_keys=True))
    print(f'{len(frames)} frames -> {len(images)} page(s) in {out} and sheet.json')


if __name__ == '__main__':
    main()
