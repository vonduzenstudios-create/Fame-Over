import type { Move } from './types';

// The basic moveset every fighter starts from, keyed by the tag (animation) each plays. Frame data
// follows 90s arcade fighters: lights hit in 3-5 frames and recover fast enough to chain, heavies
// are slower and punishable, launchers and sweeps are big commitments.
//
// Controls: LP gut punch, HP face punch, LK/HK kicks; down + button for crouching versions,
// down + HP uppercut, back + HK roundhouse (knocks down), back + LK sweep, buttons in the air for jump attacks.

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

export const STANDARD_MOVES: Record<string, Move> = {
  lp: { id: 'lp', tag: 'lp', active: [3, 7], dmg: 40, level: 'mid', effect: 'light', stun: 14, push: 3, box: box(16, -96, 36, 14) },
  hp: { id: 'hp', tag: 'hp', active: [4, 9], dmg: 60, level: 'high', effect: 'light', stun: 16, push: 3.5, box: box(16, -116, 40, 14) },
  lk: { id: 'lk', tag: 'lk', active: [5, 10], dmg: 50, level: 'mid', effect: 'light', stun: 15, push: 3.5, box: box(14, -82, 50, 16) },
  hk: { id: 'hk', tag: 'hk', active: [7, 13], dmg: 80, level: 'high', effect: 'heavy', stun: 20, push: 5, box: box(14, -120, 54, 18) },
  cp: { id: 'cp', tag: 'cp', active: [3, 7], dmg: 35, level: 'mid', effect: 'light', stun: 13, push: 2.5, box: box(16, -70, 36, 14), crouch: true },
  ck: { id: 'ck', tag: 'ck', active: [4, 9], dmg: 40, level: 'low', effect: 'light', stun: 14, push: 3, box: box(14, -18, 54, 16), crouch: true },
  uppercut: {
    id: 'uppercut', tag: 'uppercut', active: [6, 12], dmg: 130, level: 'high', effect: 'launch', stun: 0, push: 0,
    box: box(6, -150, 34, 60), crouch: true, lift: [11, 2.5],
  },
  roundhouse: { id: 'roundhouse', tag: 'roundhouse', active: [9, 15], dmg: 110, level: 'high', effect: 'knockdown', stun: 0, push: 6, box: box(10, -124, 60, 22) },
  sweep: { id: 'sweep', tag: 'sweep', active: [6, 13], dmg: 70, level: 'low', effect: 'knockdown', stun: 0, push: 3, box: box(10, -20, 64, 18) },
  jp: { id: 'jp', tag: 'jp', active: [4, 20], dmg: 60, level: 'high', effect: 'heavy', stun: 18, push: 3, box: box(14, -86, 38, 16), air: true },
  jk: { id: 'jk', tag: 'jk', active: [4, 22], dmg: 70, level: 'high', effect: 'heavy', stun: 18, push: 4, box: box(10, -56, 50, 20), air: true },
};
