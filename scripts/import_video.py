#!/usr/bin/env python3
"""Turn a generated animation video into game frames: frames/<anim>/01.png ... on the 768x768 canvas.

Video models (image-to-video from the approved character image) keep the character consistent because
they make all the frames together. Ask for: the character from the approved image, side-on facing
right, doing one move in place, locked camera, full body in shot, on a flat solid background (pure
green #00ff00 by default; use --key for another colour if the outfit has green in it).

This script picks evenly spaced frames, keys out the background, scales the figure (500 px upright
height on the first video, then the same scale for every later video of that character, saved in
<art>/scale.json), and places the feet on the pivot (384, 736). The camera is locked, so the whole
clip uses one placement: jumps and knockdowns keep their height and drift. Then run import_sheets.py on
the art folder as usual.

Usage:
  python3 scripts/import_video.py idle.mp4 --art "C:/Games/Fame Over/Graphics/Characters/chef_v01" --anim idle --frames 10 --loop
  python3 scripts/import_video.py lp.mp4 --art ... --anim lp --frames 6 --start 0.2 --end 0.9
Needs ffmpeg on the PATH, Pillow and numpy.
"""
import argparse
import json
import pathlib
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

CANVAS, PX, PY, HEIGHT = 768, 384, 736, 500


def hex_rgb(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def key_out(rgb, key, lo, hi):
    """Alpha from colour distance to the key, then remove key-colour spill from the kept pixels."""
    d = np.sqrt(((rgb - key) ** 2).sum(-1))
    a = np.clip((d - lo) / (hi - lo), 0, 1)
    out = rgb.copy()
    # despill: where the key's dominant channel is above the other two, pull it down to their max
    ch = int(np.argmax(key))
    others = [c for c in range(3) if c != ch]
    cap = np.maximum(out[..., others[0]], out[..., others[1]])
    out[..., ch] = np.minimum(out[..., ch], cap)
    a = np.where(a > 0.94, 1.0, a)  # solid inside: no faint see-through body
    a[a < 0.06] = 0
    return out, a


def largest_blob(a, step=4):
    """Keep only the biggest connected shape (drops watermarks, logos and stray specks)."""
    h, w = a.shape
    small = a[:h - h % step, :w - w % step].reshape(h // step, step, w // step, step).max((1, 3)) > 0.5
    lab = np.zeros(small.shape, np.int32)
    sizes = {}
    n = 0
    for y0, x0 in zip(*np.nonzero(small)):
        if lab[y0, x0]:
            continue
        n += 1
        stack, count = [(y0, x0)], 0
        lab[y0, x0] = n
        while stack:
            y, x = stack.pop()
            count += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1), (y + 1, x + 1), (y - 1, x - 1), (y + 1, x - 1), (y - 1, x + 1)):
                if 0 <= yy < small.shape[0] and 0 <= xx < small.shape[1] and small[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    stack.append((yy, xx))
        sizes[n] = count
    if not sizes:
        return a
    keep = lab == max(sizes, key=sizes.get)
    # grow by one cell so soft edges survive, then scale back up
    g = keep.copy()
    g[1:] |= keep[:-1]; g[:-1] |= keep[1:]; g[:, 1:] |= keep[:, :-1]; g[:, :-1] |= keep[:, 1:]
    big = np.zeros_like(a, bool)
    big[:h - h % step, :w - w % step] = np.repeat(np.repeat(g, step, 0), step, 1)
    return np.where(big, a, 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--art', required=True, help='character art folder (frames/<anim>/ is written inside it)')
    ap.add_argument('--anim', required=True, help='animation id, e.g. idle, lp, hk')
    ap.add_argument('--frames', type=int, required=True, help='how many frames to keep')
    ap.add_argument('--start', type=float, default=0, help='seconds into the clip where the move starts')
    ap.add_argument('--end', type=float, default=None, help='seconds where it ends (default: clip end)')
    ap.add_argument('--loop', action='store_true', help='looping move: the clip end is the start again, so it is left out')
    ap.add_argument('--key', default='#00ff00', help='background colour (default pure green)')
    ap.add_argument('--tolerance', default='60,140', help='colour distance "solid,clear" for the key edge')
    ap.add_argument('--keep-all', action='store_true', help='keep every shape, not just the body (for FX clips)')
    ap.add_argument('--rescale', action='store_true', help='measure the scale from this clip even if scale.json exists')
    a = ap.parse_args()

    art = pathlib.Path(a.art)
    out_dir = art / 'frames' / a.anim
    with tempfile.TemporaryDirectory() as tmp:
        cmd = ['ffmpeg', '-v', 'error', '-ss', str(a.start), '-i', a.video]
        if a.end is not None:
            cmd += ['-t', str(a.end - a.start)]
        subprocess.run(cmd + [f'{tmp}/%05d.png'], check=True)
        allf = sorted(pathlib.Path(tmp).glob('*.png'))
        if not allf:
            sys.exit('no frames decoded')
        n = len(allf)
        span = n if a.loop else n - 1
        picks = [allf[min(n - 1, round(i * span / (a.frames if a.loop else max(1, a.frames - 1))))] for i in range(a.frames)]
        key = hex_rgb(a.key)
        lo, hi = (float(v) for v in a.tolerance.split(','))
        keyed = []
        for f in picks:
            rgb = np.asarray(Image.open(f).convert('RGB'), np.float32)
            rgb, al = key_out(rgb, key, lo, hi)
            keyed.append((rgb, al if a.keep_all else largest_blob(al)))

    # placement from the first frame: figure height -> scale, feet -> pivot
    _, a0 = keyed[0]
    ys, xs = np.where(a0 > 0.5)
    if not len(ys):
        sys.exit('first frame is empty after keying: check --key')
    top, bot = ys.min(), ys.max()
    feet = xs[ys >= bot - max(4, (bot - top) // 25)]
    foot_x = (feet.min() + feet.max()) / 2
    art.mkdir(parents=True, exist_ok=True)
    scale_file = art / 'scale.json'
    if scale_file.exists() and not a.rescale:
        scale = json.loads(scale_file.read_text())['videoScale']
    else:
        scale = HEIGHT / (bot - top + 1)
        scale_file.write_text(json.dumps({'videoScale': scale, 'from': f'{a.anim}: {pathlib.Path(a.video).name}',
                                          'sourceHeight': int(bot - top + 1)}, indent=1))
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob('*.png'):
        old.unlink()
    for i, (rgb, al) in enumerate(keyed):
        h, w = al.shape
        im = Image.fromarray(np.dstack([rgb * al[..., None], al * 255]).round().astype(np.uint8), 'RGBA')  # premultiplied
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        px = np.asarray(im, np.float32)
        al2 = px[..., 3:4] / 255
        px[..., :3] = np.where(al2 > 0, px[..., :3] / np.maximum(al2, 1e-6), 0)
        im = Image.fromarray(np.clip(px, 0, 255).round().astype(np.uint8), 'RGBA')
        frame = Image.new('RGBA', (CANVAS, CANVAS))
        frame.paste(im, (round(PX - foot_x * scale), round(PY - bot * scale)), im)
        frame.save(out_dir / f'{i + 1:02d}.png')
    print(f'{a.frames} frames -> {out_dir} (scale {scale:.4f}, source figure {bot - top + 1} px tall on frame 1)')


if __name__ == '__main__':
    main()
