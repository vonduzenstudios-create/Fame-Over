import type { Box, Frame, Sheet, SheetData, Tag } from './sheet';

// A stand-in mannequin drawn for every frame a fighter's tags name, so the game is playable before
// any art exists. Each tag gets a pose type; frames in the middle of an attack tag reach furthest.
// The boxes here are also the defaults the art importer starts from.

type Kind = 'stand' | 'walk' | 'crouch' | 'air' | 'punch' | 'punchHigh' | 'cpunch' | 'upper' | 'kick' | 'kickHigh'
  | 'ckick' | 'sweep' | 'apunch' | 'akick' | 'block' | 'cblock' | 'hit' | 'chit' | 'fly' | 'down' | 'dizzy' | 'win';

const KIND: Record<string, Kind> = {
  idle: 'stand', turn: 'stand', walk: 'walk', crouch: 'crouch', stand: 'crouch', jump: 'air', flip: 'air',
  lp: 'punch', hp: 'punchHigh', cp: 'cpunch', uppercut: 'upper', jp: 'apunch',
  lk: 'kick', hk: 'kickHigh', roundhouse: 'kickHigh', ck: 'ckick', sweep: 'sweep', jk: 'akick',
  block: 'block', cblock: 'cblock', hitHigh: 'hit', hitMid: 'hit', hitCrouch: 'chit',
  throw: 'punch', thrown: 'fly', intro: 'win',
  launched: 'fly', knockdown: 'down', lie: 'down', getup: 'crouch', ko: 'down', dizzy: 'dizzy', victory: 'win',
};

const FW = 120, FH = 160, AX = 50, AY = 150;
const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

/** Default hurtboxes for a pose type: head, body, legs when standing. */
export function hurtFor(kind: string): Box[] {
  switch (kind) {
    case 'crouch': case 'cpunch': case 'ckick': case 'sweep': case 'cblock': case 'chit': case 'upper':
      return [b(-12, -84, 24, 22), b(-20, -64, 40, 64)];
    case 'air': case 'apunch': case 'akick': case 'fly':
      return [b(-12, -116, 24, 22), b(-18, -96, 36, 70)];
    case 'down':
      return [b(-50, -26, 100, 26)];
    default:
      return [b(-11, -130, 22, 22), b(-17, -108, 34, 52), b(-17, -56, 34, 56)];
  }
}

interface PoseFrame { kind: Kind; ext: number; t: number }

function poses(tags: Record<string, Tag>): Map<string, PoseFrame> {
  const out = new Map<string, PoseFrame>();
  for (const [name, tag] of Object.entries(tags)) {
    const kind = KIND[name] ?? 'stand';
    const n = tag.frames.length;
    tag.frames.forEach(([f], i) => {
      if (out.has(f)) return;
      // reach peaks at the middle frame of an attack, 0 at the ends
      const ext = n <= 1 ? 1 : 1 - Math.abs(i / (n - 1) - 0.5) * 2;
      out.set(f, { kind, ext: Math.round(ext * 4) / 4, t: n <= 1 ? 0 : i / (n - 1) });
    });
  }
  return out;
}

/** Frame data for every frame the tags name, laid out in a grid. Pure, so tests and the importer can use it. */
export function placeholderData(tags: Record<string, Tag>): SheetData {
  const frames: Record<string, Frame> = {};
  const cols = 16;
  let i = 0;
  for (const [name, p] of poses(tags)) {
    frames[name] = { x: (i % cols) * FW, y: Math.floor(i / cols) * FH, w: FW, h: FH, ax: AX, ay: AY, hurt: hurtFor(p.kind) };
    i++;
  }
  return { image: '', frames };
}

const SKIN = '#e0a878', SHIRT = '#f4f4f0', PANTS = '#202028', HAIR = '#e8c050', LINE = '#101014';

function limb(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, col: string) {
  c.strokeStyle = LINE;
  c.lineCap = 'round';
  c.lineWidth = w + 2;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
}

/** Draw one mannequin pose with its feet anchor at (0, 0), facing right. */
function drawPose(c: CanvasRenderingContext2D, p: PoseFrame) {
  const e = p.ext;
  if (p.kind === 'down') {
    limb(c, -40, -8, 0, -10, 12, PANTS);
    limb(c, 0, -12, 30, -12, 22, SHIRT);
    c.fillStyle = SKIN; c.fillRect(32, -22, 16, 16);
    c.fillStyle = HAIR; c.fillRect(44, -22, 5, 16);
    return;
  }
  const crouch = ['crouch', 'cpunch', 'ckick', 'sweep', 'cblock', 'chit'].includes(p.kind) || (p.kind === 'upper' && e < 0.75);
  const air = ['air', 'apunch', 'akick', 'fly'].includes(p.kind);
  const hipY = crouch ? -40 : air ? -60 : -62;
  const lean = p.kind === 'hit' || p.kind === 'chit' || p.kind === 'fly' ? -10 : p.kind === 'dizzy' ? -4 + 6 * Math.sin(p.t * 6.28) : 0;
  const shX = lean, shY = hipY - 46;
  // legs
  if (crouch) {
    limb(c, 0, hipY, 18, -22, 13, PANTS); limb(c, 18, -22, 10, 0, 12, PANTS);
    if (p.kind === 'ckick' || p.kind === 'sweep') limb(c, 0, hipY, 20 + 50 * e, -6, 12, PANTS);
    else { limb(c, 0, hipY, -14, -22, 13, PANTS); limb(c, -14, -22, -18, 0, 12, PANTS); }
  } else if (air) {
    limb(c, 0, hipY, 14, hipY + 22, 13, PANTS); limb(c, 14, hipY + 22, 2, hipY + 40, 12, PANTS);
    if (p.kind === 'akick') limb(c, 0, hipY, 20 + 34 * e, hipY + 30, 12, PANTS);
    else { limb(c, 0, hipY, -10, hipY + 24, 13, PANTS); limb(c, -10, hipY + 24, -20, hipY + 36, 12, PANTS); }
  } else {
    const kick = p.kind === 'kick' || p.kind === 'kickHigh';
    const stride = p.kind === 'walk' ? 12 * Math.sin(p.t * 6.28) : 0;
    limb(c, 0, hipY, -10 - stride, -30, 13, PANTS); limb(c, -10 - stride, -30, -14 - stride, 0, 12, PANTS);
    if (kick) {
      const up = p.kind === 'kickHigh' ? -60 : -24;
      limb(c, 0, hipY, 12 + 40 * e, hipY + (1 - e) * 40 + e * up, 12, PANTS);
    } else { limb(c, 0, hipY, 10 + stride, -30, 13, PANTS); limb(c, 10 + stride, -30, 12 + stride, 0, 12, PANTS); }
  }
  // torso and head
  limb(c, 0, hipY, shX, shY, 24, SHIRT);
  c.fillStyle = LINE; c.fillRect(shX - 10, shY - 24, 20, 22);
  c.fillStyle = SKIN; c.fillRect(shX - 9, shY - 23, 18, 20);
  c.fillStyle = HAIR; c.fillRect(shX - 9, shY - 26, 18, 6);
  c.fillStyle = LINE; c.fillRect(shX + 4, shY - 16, 2, 2);
  // arms
  const reach = (dx: number, dy: number) => { limb(c, shX + 4, shY + 4, shX + dx, shY + dy, 9, SKIN); };
  switch (p.kind) {
    case 'punch': case 'cpunch': reach(14 + 38 * e, 14 - 4 * e); limb(c, shX - 2, shY + 4, shX + 12, shY + 10, 9, SKIN); break;
    case 'punchHigh': case 'apunch': reach(14 + 40 * e, 8 - 12 * e); limb(c, shX - 2, shY + 4, shX + 12, shY + 10, 9, SKIN); break;
    case 'upper': reach(10 + 6 * e, 10 - 60 * e); break;
    case 'block': case 'cblock': limb(c, shX + 4, shY + 4, shX + 14, shY - 20, 9, SKIN); limb(c, shX, shY + 6, shX + 10, shY - 16, 9, SKIN); break;
    case 'hit': case 'chit': case 'fly': reach(-14, 24); limb(c, shX, shY + 4, shX - 18, shY + 20, 9, SKIN); break;
    case 'win': reach(10, -40); limb(c, shX - 2, shY + 4, shX - 10, shY + 30, 9, SKIN); break;
    default: reach(16, 12); limb(c, shX - 2, shY + 4, shX + 12, shY + 8, 9, SKIN);
  }
}

/** The placeholder sheet: its data, plus the drawn image when running in a browser. */
export function placeholderSheet(tags: Record<string, Tag>): Sheet {
  const data = placeholderData(tags);
  if (typeof document === 'undefined') return { data, img: null };
  const names = Object.keys(data.frames);
  const cv = document.createElement('canvas');
  cv.width = 16 * FW;
  cv.height = Math.ceil(names.length / 16) * FH;
  const c = cv.getContext('2d')!;
  const ps = poses(tags);
  for (const n of names) {
    const f = data.frames[n];
    c.save();
    c.beginPath(); c.rect(f.x, f.y, f.w, f.h); c.clip();
    c.translate(f.x + f.ax, f.y + f.ay);
    drawPose(c, ps.get(n)!);
    c.restore();
  }
  return { data, img: cv };
}
