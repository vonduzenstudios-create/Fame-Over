import { MAX_HP, MIN_GAP, ROUND_TIME, STAGE_W, W } from '../core/consts';
import type { RawInput } from '../core/input';
import { overlap } from '../sprites/sheet';
import type { Fighter } from './fighter';
import type { Move } from './types';

export type Phase = 'intro' | 'fight' | 'ko' | 'over';

/** Things that happened this step, for sound and effects. The simulation itself never plays sound. */
export type FightEvent =
  | { t: 'hit'; heavy: boolean; x: number; y: number }
  | { t: 'block'; x: number; y: number }
  | { t: 'whoosh' }
  | { t: 'round'; n: number }
  | { t: 'fight' }
  | { t: 'ko' }
  | { t: 'winner'; side: 0 | 1 | -1 };

const INTRO = 100;
const KO_TIME = 200;
const WINS_NEEDED = 2;

/**
 * One match. Fully deterministic: the same inputs from the same start always give the same fight,
 * which is what online lockstep play needs. It reads only sprite data (numbers), never images.
 */
export class Fight {
  t = 0;
  round = 1;
  timer = ROUND_TIME * 60;
  phase: Phase = 'intro';
  phaseT = 0;
  hitstop = 0;
  wins = [0, 0];
  /** Winner of the last round (-1 for a draw). */
  roundWinner: 0 | 1 | -1 = -1;
  events: FightEvent[] = [];

  constructor(public f: [Fighter, Fighter]) {
    f[0].opp = f[1];
    f[1].opp = f[0];
    this.resetRound();
  }

  resetRound() {
    const mid = STAGE_W / 2;
    this.f[0].x = mid - 70;
    this.f[1].x = mid + 70;
    for (const g of this.f) {
      g.hp = MAX_HP;
      g.y = g.vx = g.vy = g.stun = 0;
      g.move = null;
      g.crouching = false;
      g.setState('idle', 'idle');
      g.faceOpponent();
    }
    this.timer = ROUND_TIME * 60;
    this.phase = 'intro';
    this.phaseT = 0;
    this.events.push({ t: 'round', n: this.round });
  }

  step(inputs: [RawInput, RawInput]) {
    this.events = [];
    this.t++;
    this.f[0].readInput(inputs[0]);
    this.f[1].readInput(inputs[1]);
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    this.phaseT++;
    const live = this.phase === 'fight';
    for (const g of this.f) g.faceOpponent();
    for (const g of this.f) {
      const tt = g.tt, mv = g.move;
      g.update(live);
      if (g.move && (g.move !== mv || g.tt < tt)) this.events.push({ t: 'whoosh' });
    }
    if (live) this.resolveHits();
    this.separate();
    this.updatePhase();
  }

  private resolveHits() {
    const hits: [Fighter, Fighter, Move][] = [];
    for (const a of this.f) {
      const hb = a.hitbox();
      if (hb && a.opp.hurtboxes().some((h) => overlap(hb, h))) hits.push([a, a.opp, a.move!]);
    }
    // both can trade hits on the same frame
    for (const [a, d, m] of hits) this.applyHit(a, d, m);
  }

  private canBlock(d: Fighter, m: Move) {
    if (d.airborne || !['idle', 'walk', 'crouch', 'block'].includes(d.state)) return false;
    if (!(d.input.bl || d.holdingBack)) return false;
    return d.crouching || d.input.d ? true : m.level !== 'low';
  }

  private applyHit(a: Fighter, d: Fighter, m: Move) {
    a.hits++;
    const away = d.x >= a.x ? 1 : -1;
    const hx = d.x - away * 10, hy = d.screenY - 80;
    if (this.canBlock(d, m)) {
      d.crouching = d.input.d;
      d.setState('block', d.crouching ? 'cblock' : 'block');
      d.stun = Math.round((m.stun || 16) * 0.65);
      d.vx = away * m.push * 0.8;
      this.hitstop = 5;
      this.events.push({ t: 'block', x: hx, y: hy });
      return;
    }
    d.hp = Math.max(0, d.hp - m.dmg);
    d.move = null;
    const heavy = m.effect !== 'light';
    this.hitstop = heavy ? 9 : 6;
    this.events.push({ t: 'hit', heavy, x: hx, y: hy });
    if (m.effect === 'launch' || m.effect === 'knockdown' || d.airborne || d.hp <= 0) {
      const [up, back] = m.lift ?? (m.effect === 'knockdown' ? [4, 3] : [6, 2.5]);
      d.vy = up;
      d.y = Math.max(d.y, 1);
      d.vx = away * back;
      d.crouching = false;
      d.setState('launched', m.effect === 'knockdown' ? 'knockdown' : 'launched');
    } else {
      d.stun = m.stun;
      d.vx = away * m.push;
      const tag = d.crouching ? 'hitCrouch' : m.level === 'high' ? 'hitHigh' : 'hitMid';
      d.setState('hit', tag);
    }
  }

  /** Keep the fighters from overlapping, inside the stage, and within one screen of each other. */
  private separate() {
    const [a, b] = this.f;
    const dx = b.x - a.x;
    if (Math.abs(dx) < MIN_GAP && !a.airborne && !b.airborne) {
      const push = (MIN_GAP - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= push * s;
      b.x += push * s;
    }
    const maxApart = W - 60;
    if (Math.abs(b.x - a.x) > maxApart) {
      const mid = (a.x + b.x) / 2, s = b.x >= a.x ? 1 : -1;
      a.x = mid - (s * maxApart) / 2;
      b.x = mid + (s * maxApart) / 2;
    }
    for (const g of this.f) g.x = Math.max(24, Math.min(STAGE_W - 24, g.x));
  }

  private updatePhase() {
    if (this.phase === 'intro' && this.phaseT >= INTRO) {
      this.phase = 'fight';
      this.phaseT = 0;
      this.events.push({ t: 'fight' });
    } else if (this.phase === 'fight') {
      this.timer--;
      const [a, b] = this.f;
      if (a.hp <= 0 || b.hp <= 0 || this.timer <= 0) {
        this.roundWinner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
        if (this.roundWinner >= 0) this.wins[this.roundWinner]++;
        this.phase = 'ko';
        this.phaseT = 0;
        this.events.push({ t: 'ko' });
        // a loser still standing (time out) drops where they are
        for (const g of this.f)
          if (this.roundWinner !== g.side && this.roundWinner >= 0 && !g.airborne && g.state !== 'down') {
            g.move = null;
            g.setState('ko', 'ko');
          }
      }
    } else if (this.phase === 'ko') {
      const w = this.roundWinner;
      if (this.phaseT === 50 && w !== -1) {
        const g = this.f[w as 0 | 1];
        if (!g.airborne) g.setState('win', 'victory');
      }
      if (this.phaseT >= KO_TIME) {
        if (this.wins[0] >= WINS_NEEDED || this.wins[1] >= WINS_NEEDED) {
          this.phase = 'over';
          this.phaseT = 0;
          this.events.push({ t: 'winner', side: this.wins[0] > this.wins[1] ? 0 : 1 });
        } else {
          this.round++;
          this.resetRound();
        }
      }
    }
  }

  /** Where the camera's left edge is, following the midpoint of the two fighters. */
  get camX() {
    const mid = (this.f[0].x + this.f[1].x) / 2;
    return Math.max(0, Math.min(STAGE_W - W, Math.round(mid - W / 2)));
  }

  /** A checksum of everything that matters, so two online games can tell if they ever drift apart. */
  hash() {
    let h = 2166136261;
    const mix = (n: number) => (h = Math.imul(h ^ (n | 0), 16777619));
    mix(this.t), mix(this.round), mix(this.timer), mix(this.wins[0]), mix(this.wins[1]);
    for (const g of this.f) {
      mix(Math.round(g.x * 64)), mix(Math.round(g.y * 64)), mix(g.hp), mix(g.facing), mix(g.tt);
      for (let i = 0; i < g.state.length; i++) mix(g.state.charCodeAt(i));
      for (let i = 0; i < g.tag.length; i++) mix(g.tag.charCodeAt(i));
    }
    return h >>> 0;
  }
}
