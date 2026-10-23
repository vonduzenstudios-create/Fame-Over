import { EMPTY, RawInput } from '../core/input';
import { rng, Rng } from '../core/rng';
import type { Fighter } from './fighter';

/**
 * A simple CPU opponent: walks in, throws a mix of attacks up close, blocks some of what comes at
 * it and sometimes jumps in. Seeded, so a CPU fight replays the same way every time.
 */
export class AI {
  private r: Rng;
  private hold: RawInput = { ...EMPTY };
  private holdFor = 0;
  private rest = 0;

  constructor(seed: number, public level = 1) {
    this.r = rng(seed);
  }

  read(me: Fighter): RawInput {
    if (this.holdFor-- > 0) return this.hold;
    if (this.rest > 0) {
      this.rest--;
      return EMPTY;
    }
    const o = me.opp;
    const dist = Math.abs(o.x - me.x);
    const fwd: Partial<RawInput> = me.facing > 0 ? { r: true } : { l: true };
    const back: Partial<RawInput> = me.facing > 0 ? { l: true } : { r: true };
    const r = this.r.next();
    let out: Partial<RawInput> = {};
    let dur = 6;
    const threatened = o.state === 'attack' || (o.airborne && dist < 140);
    if (threatened && r < 0.25 + 0.15 * this.level) {
      out = { bl: true, d: o.move?.level === 'low' };
      dur = 14;
    } else if (dist > 120) {
      out = r < 0.06 ? { u: true, ...fwd } : fwd;
      dur = 10;
    } else if (dist > 75) {
      out = r < 0.2 ? { ...back, lk: true } : r < 0.35 ? { hk: true } : fwd;
      dur = 4;
    } else {
      const pick = this.r.int(0, 7);
      out = [{ lp: true }, { hp: true }, { lk: true }, { hk: true }, { d: true, lk: true }, { d: true, hp: true }, { ...back, hk: true }, back][pick];
      dur = pick === 7 ? 12 : 3;
    }
    this.hold = { ...EMPTY, ...out };
    // release buttons between attacks so each one counts as a fresh press
    this.holdFor = dur;
    if (out.lp || out.hp || out.lk || out.hk) {
      this.holdFor = 1;
      this.rest = this.r.int(8, 30 - 8 * this.level);
    }
    return this.hold;
  }
}
