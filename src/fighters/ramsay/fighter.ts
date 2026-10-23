import { STANDARD_MOVES } from '../../fight/moves';
import type { FighterDef } from '../../fight/types';
import type { Tag } from '../../sprites/sheet';

// Gordon Ramsay, the first Fame Over fighter.
//
// Frame names follow docs/ART_SPEC.md: "<animation id>/<nn>", e.g. "lp/03". Which frames make each
// move, and how long each is held (game frames, 60 a second), is decided here, so frame data is
// reviewed and tested like code. Frames the art doesn't have yet are drawn as a placeholder mannequin
// (src/sprites/placeholder.ts).

/** Frames "<id>/01".."<id>/<n>" held for `ticks` each (or a list, one per frame). */
const anim = (id: string, ticks: number | number[], n = Array.isArray(ticks) ? ticks.length : 1, loop = false): Tag => ({
  frames: Array.from({ length: n }, (_, i) => [`${id}/${String(i + 1).padStart(2, '0')}`, Array.isArray(ticks) ? ticks[i] : ticks]),
  loop,
});
/** Play some of another animation's frames, e.g. standing back up from the crouch. */
const frames = (id: string, list: [number, number][]): Tag => ({ frames: list.map(([n, t]) => [`${id}/${String(n).padStart(2, '0')}`, t]) });

export const RAMSAY_TAGS: Record<string, Tag> = {
  idle: anim('idle', 6, 8, true),
  turn: anim('turn', [3, 3]),
  walk: anim('walk', 5, 9, true),
  crouch: anim('crouch', [2, 2, 1]),
  stand: frames('crouch', [[3, 2], [2, 2], [1, 1]]),
  jump: anim('jump', [6, 18, 30]),
  flip: anim('flip', 5, 8),
  intro: anim('intro', 8, 10),

  lp: anim('lp', [2, 2, 4, 2, 2]),
  hp: anim('hp', [3, 2, 5, 3, 3]),
  cp: anim('cp', [2, 2, 4, 2, 2]),
  uppercut: anim('uppercut', [3, 3, 4, 8, 8]),
  jp: anim('jp', [2, 3, 30]),
  lk: anim('lk', [3, 3, 5, 3, 3]),
  hk: anim('hk', [4, 4, 6, 4, 4]),
  roundhouse: anim('roundhouse', 3, 9),
  ck: anim('ck', [2, 3, 5, 3, 3]),
  sweep: anim('sweep', 3, 8),
  jk: anim('jk', [2, 3, 30]),
  throw: anim('throw', 5, 6),
  thrown: anim('thrown', 5, 6),

  block: anim('block', [2, 2, 1]),
  cblock: anim('cblock', [2, 2, 1]),
  hitHigh: anim('hitHigh', [3, 5, 8]),
  hitMid: anim('hitMid', [3, 5, 8]),
  hitCrouch: anim('hitCrouch', [3, 5, 8]),
  launched: anim('launched', [5, 7, 7, 60]),
  knockdown: anim('knockdown', [4, 4, 6, 60]),
  lie: anim('lie', [6, 6, 6, 60]),
  getup: anim('getup', 5, 4),
  ko: anim('ko', 6, 8),
  dizzy: anim('dizzy', 7, 8, true),
  victory: anim('victory', 6, 10),
};

export const RAMSAY: FighterDef = {
  id: 'ramsay',
  name: 'Gordon Ramsay',
  sheetUrl: 'fighters/ramsay/sheet.json',
  tags: RAMSAY_TAGS,
  moves: STANDARD_MOVES,
  walk: 2.2,
  walkBack: 1.8,
};
