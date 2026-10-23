import { describe, expect, it } from 'vitest';
import { FIGHTERS } from '../src/fighters/registry';
import { tagLength } from '../src/sprites/sheet';

// Startup = first active frame, recovery = frames after the last active one. Change deliberately.
const FRAME_DATA: Record<string, [number, number, number]> = {
  lp: [3, 4, 5], hp: [4, 5, 7], lk: [5, 5, 7], hk: [7, 6, 9], cp: [3, 4, 5], ck: [4, 5, 7],
  uppercut: [6, 6, 14], roundhouse: [9, 6, 12], sweep: [6, 7, 11], jp: [4, 16, 15], jk: [4, 18, 13],
};

for (const def of FIGHTERS) {
  describe(def.name, () => {
    it('has every animation the game plays', () => {
      for (const t of ['idle', 'turn', 'walk', 'crouch', 'stand', 'jump', 'flip', 'block', 'cblock', 'hitHigh', 'hitMid', 'hitCrouch',
        'launched', 'knockdown', 'lie', 'getup', 'ko', 'dizzy', 'victory'])
        expect(def.tags[t], t).toBeDefined();
    });
    it('every move has its tag, and its active frames fit inside it', () => {
      for (const m of Object.values(def.moves)) {
        const tag = def.tags[m.tag];
        expect(tag, m.id).toBeDefined();
        expect(m.active[0]).toBeLessThan(m.active[1]);
        expect(m.active[1], m.id).toBeLessThanOrEqual(tagLength(tag));
      }
    });
    it('keeps the pinned frame data', () => {
      const got: Record<string, [number, number, number]> = {};
      for (const [k, m] of Object.entries(def.moves)) got[k] = [m.active[0], m.active[1] - m.active[0], tagLength(def.tags[m.tag]) - m.active[1]];
      expect(got).toEqual(FRAME_DATA);
    });
  });
}
