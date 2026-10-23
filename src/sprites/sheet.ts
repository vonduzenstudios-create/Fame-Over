// Sprite sheets: one image holding every frame of a fighter, plus data saying where each frame is
// and which boxes it carries. The fight simulation only ever reads the data (whole numbers), never
// the image, so both games in an online match compute the same fight even if one is still loading.

/** A rectangle relative to the frame's feet anchor, for a fighter facing right. y is negative upwards. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Frame {
  /** Which sheet image (page) holds the frame; 0 when there is one. */
  page?: number;
  /** Where the frame sits in that image. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Feet anchor inside the frame: the point that stands on the floor. */
  ax: number;
  ay: number;
  /** Where this fighter can be hit on this frame. */
  hurt: Box[];
  /** Where an attack connects on this frame (only attack frames have one). */
  hit?: Box;
}

/** What a sheet's .json file holds: frames keyed by name, e.g. "lp/02", and the page images they sit on. */
export interface SheetData {
  images: string[];
  frames: Record<string, Frame>;
}

/**
 * One animation: frame names with how many game frames (60 a second) each is held.
 * Tags are written in code per fighter, so timing (and frame data) is reviewed and tested like code.
 */
export interface Tag {
  frames: [string, number][];
  loop?: boolean;
}

export interface Sheet {
  data: SheetData;
  /** The page images (empty in tests, where nothing is drawn). */
  imgs: CanvasImageSource[];
  /** Draws a frame itself (the placeholder) instead of copying it from an image. Feet anchor at (0, 0), facing right. */
  render?: (ctx: CanvasRenderingContext2D, name: string) => void;
  /** Drawn (and its boxes used) for any frame this sheet doesn't have yet. */
  fallback?: Sheet;
}

/** Frame data the fight uses: this sheet's frames, with the fallback's filling any gaps. */
export function simData(s: Sheet): SheetData {
  if (!s.fallback) return s.data;
  return { images: s.data.images, frames: { ...simData(s.fallback).frames, ...s.data.frames } };
}

export function tagLength(t: Tag) {
  let n = 0;
  for (const [, d] of t.frames) n += d;
  return n;
}

/** Index into tag.frames shown at tick `t` (0-based). Non-looping tags hold their last frame. */
export function frameIndexAt(tag: Tag, t: number): number {
  const len = tagLength(tag);
  if (tag.loop && len > 0) t = ((t % len) + len) % len;
  let acc = 0;
  for (let i = 0; i < tag.frames.length; i++) {
    acc += tag.frames[i][1];
    if (t < acc) return i;
  }
  return tag.frames.length - 1;
}

export function frameNameAt(tag: Tag, t: number): string {
  return tag.frames[frameIndexAt(tag, t)][0];
}

/** Box flipped to world space for a fighter at (x, floorY - height) facing `facing`. */
export function worldBox(b: Box, x: number, y: number, facing: number): Box {
  const bx = facing > 0 ? x + b.x : x - b.x - b.w;
  return { x: bx, y: y + b.y, w: b.w, h: b.h };
}

export function overlap(a: Box, b: Box) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Draw a frame with its feet anchor at (x, y). Art faces right; facing -1 mirrors it. */
export function drawFrame(ctx: CanvasRenderingContext2D, sheet: Sheet, name: string, x: number, y: number, facing: number) {
  const f = sheet.data.frames[name];
  if (!f && sheet.fallback) return drawFrame(ctx, sheet.fallback, name, x, y, facing);
  if (!f) return;
  const img = sheet.imgs[f.page ?? 0];
  if (!img && !sheet.render) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) ctx.scale(-1, 1);
  if (sheet.render) sheet.render(ctx, name);
  else ctx.drawImage(img, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
  ctx.restore();
}

/** Load a sheet from a .json URL (page image paths are relative to the .json). Resolves null if missing. */
export async function loadSheet(url: string): Promise<Sheet | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as SheetData;
    const base = new URL(url, location.href);
    const imgs = await Promise.all(
      data.images.map(async (src) => {
        const img = new Image();
        img.src = new URL(src, base).href;
        await img.decode();
        return img;
      }),
    );
    return { data, imgs };
  } catch {
    return null;
  }
}
