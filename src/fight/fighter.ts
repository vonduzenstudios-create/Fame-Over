import { FLOOR, GRAV, MAX_HP } from '../core/consts';
import type { RawInput } from '../core/input';
import { EMPTY } from '../core/input';
import { hurtFor } from '../sprites/placeholder';
import { Box, Frame, SheetData, frameNameAt, tagLength, worldBox } from '../sprites/sheet';
import type { Btn, FighterDef, Move } from './types';

export type State = 'idle' | 'walk' | 'crouch' | 'jump' | 'attack' | 'block' | 'hit' | 'launched' | 'down' | 'getup' | 'win' | 'ko';

const BTNS: Btn[] = ['lp', 'hp', 'lk', 'hk'];
/** A press stays usable this many frames, so attacks typed a little early still come out. */
const BUFFER = 6;
const JUMP_V = 44;

export class Fighter {
  x: number;
  /** Height above the floor. */
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1;
  hp = MAX_HP;
  state: State = 'idle';
  /** Frames spent in the current state. */
  st = 0;
  tag = 'idle';
  /** Frames since the current tag started. */
  tt = 0;
  move: Move | null = null;
  /** Times the current move has connected (hit or blocked). */
  hits = 0;
  stun = 0;
  crouching = false;
  /** Frames since each button was last pressed (99 = not recently). */
  buf: Record<Btn, number> = { lp: 99, hp: 99, lk: 99, hk: 99 };
  prev: RawInput = { ...EMPTY };
  input: RawInput = { ...EMPTY };
  opp!: Fighter;

  constructor(public def: FighterDef, public data: SheetData, public side: 0 | 1, x: number) {
    this.x = x;
    this.facing = side === 0 ? 1 : -1;
  }

  get airborne() {
    return this.y > 0 || this.state === 'jump' || this.state === 'launched' || !!this.move?.air;
  }
  get holdingBack() {
    return this.facing > 0 ? this.input.l : this.input.r;
  }
  get holdingFwd() {
    return this.facing > 0 ? this.input.r : this.input.l;
  }
  /** Getting up and lying down can't be hit. */
  get invulnerable() {
    return this.state === 'down' || this.state === 'getup' || this.state === 'ko';
  }

  setTag(name: string) {
    if (this.tag !== name) {
      this.tag = name;
      this.tt = 0;
    }
  }
  setState(s: State, tag?: string) {
    this.state = s;
    this.st = 0;
    if (tag) {
      this.tag = tag;
      this.tt = 0;
    }
  }

  /** Name of the frame showing now. */
  get frameName() {
    const tag = this.def.tags[this.tag] ?? this.def.tags.idle;
    return frameNameAt(tag, this.tt);
  }
  get frame(): Frame | undefined {
    return this.data.frames[this.frameName];
  }
  get screenY() {
    return FLOOR - this.y;
  }

  hurtboxes(): Box[] {
    if (this.invulnerable) return [];
    const boxes = this.frame?.hurt ?? hurtFor(this.crouching ? 'crouch' : this.airborne ? 'air' : 'stand');
    return boxes.map((b) => worldBox(b, this.x, this.screenY, this.facing));
  }

  /** The attack's hitbox this frame, or null when nothing is active. */
  hitbox(): Box | null {
    const m = this.move;
    if (this.state !== 'attack' || !m || this.hits > 0) return null;
    if (this.tt < m.active[0] || this.tt >= m.active[1]) return null;
    return worldBox(this.frame?.hit ?? m.box, this.x, this.screenY, this.facing);
  }

  /** Record button presses for the input buffer. Also runs during hit-stop so presses aren't lost. */
  readInput(inp: RawInput) {
    for (const b of BTNS) this.buf[b] = inp[b] && !this.prev[b] ? 0 : Math.min(99, this.buf[b] + 1);
    this.prev = inp;
    this.input = inp;
  }

  private buffered(): Btn | null {
    let best: Btn | null = null;
    for (const b of BTNS) if (this.buf[b] <= BUFFER && (best === null || this.buf[b] < this.buf[best])) best = b;
    return best;
  }

  /** Which move a button makes right now, from the stick and whether we're in the air. */
  private pick(b: Btn): Move | undefined {
    const M = this.def.moves;
    if (this.airborne) return b === 'lp' || b === 'hp' ? M.jp : M.jk;
    if (this.input.d) return { lp: M.cp, hp: M.uppercut, lk: M.ck, hk: M.sweep }[b];
    if (this.holdingBack && b === 'hk') return M.roundhouse;
    if (this.holdingBack && b === 'lk') return M.sweep;
    return M[b];
  }

  startMove(m: Move) {
    this.move = m;
    this.hits = 0;
    this.crouching = !!m.crouch;
    this.setState('attack', m.tag);
    for (const b of BTNS) this.buf[b] = 99;
    if (!m.air) this.vx = m.vx ? m.vx * this.facing : 0;
  }

  private tryAttack(): boolean {
    const b = this.buffered();
    if (!b) return false;
    const m = this.pick(b);
    if (!m) return false;
    this.startMove(m);
    return true;
  }

  /** One simulation step. `canAct` is false before the round starts and after it ends. */
  update(canAct: boolean) {
    this.tt++;
    this.st++;
    const inp = canAct ? this.input : EMPTY;
    switch (this.state) {
      case 'idle':
      case 'walk':
      case 'crouch': {
        if (canAct && this.tryAttack()) break;
        this.crouching = inp.d;
        if (inp.bl) {
          this.setState('block', this.crouching ? 'cblock' : 'block');
          this.vx = 0;
        } else if (inp.u) {
          const dir = this.holdingFwd ? 1 : this.holdingBack ? -1 : 0;
          this.vx = dir * this.facing * this.def.walk * 1.6;
          this.vy = JUMP_V;
          this.crouching = false;
          this.setState('jump', dir ? 'flip' : 'jump');
        } else if (inp.d) {
          this.vx = 0;
          if (this.state !== 'crouch') this.setState('crouch', 'crouch');
        } else if (this.holdingFwd || this.holdingBack) {
          this.vx = (this.holdingFwd ? this.def.walk : -this.def.walkBack) * this.facing;
          if (this.state !== 'walk') this.setState('walk', 'walk');
        } else {
          this.vx = 0;
          if (this.state === 'crouch') this.setState('idle', 'stand');
          else if (this.state !== 'idle') this.setState('idle', 'idle');
          else if ((this.tag === 'stand' || this.tag === 'turn') && this.tt >= tagLength(this.def.tags[this.tag])) this.setTag('idle');
        }
        break;
      }
      case 'jump':
        if (canAct && !this.move) this.tryAttack();
        break;
      case 'attack': {
        const m = this.move!;
        // light attacks chain into another light once they've connected
        if (canAct && this.hits > 0 && m.effect === 'light' && this.tt >= m.active[0]) {
          const b = this.buffered();
          const next = b && this.pick(b);
          if (next && next.effect === 'light' && !next.air) {
            this.startMove(next);
            break;
          }
        }
        if (!m.air && this.tt >= tagLength(this.def.tags[m.tag])) this.endMove();
        break;
      }
      case 'block':
        if (this.stun > 0) this.stun--;
        else if (!inp.bl) this.setState('idle', 'idle');
        else {
          const c = inp.d;
          if (c !== this.crouching) this.setTag(c ? 'cblock' : 'block');
          this.crouching = c;
        }
        this.vx *= 0.8;
        break;
      case 'hit':
        this.vx *= 0.8;
        if (--this.stun <= 0) this.setState('idle', this.crouching ? 'crouch' : 'idle');
        break;
      case 'down':
        if (this.st >= 30 && this.hp > 0) this.setState('getup', 'getup');
        break;
      case 'getup':
        if (this.tt >= tagLength(this.def.tags.getup)) this.setState('idle', 'idle');
        break;
      case 'win':
      case 'ko':
        this.vx *= 0.8;
        break;
    }
    this.physics();
  }

  private endMove() {
    this.move = null;
    if (this.crouching && this.input.d) this.setState('crouch', 'crouch');
    else {
      this.crouching = false;
      this.setState('idle', 'idle');
    }
  }

  private physics() {
    this.x += this.vx;
    if (this.y > 0 || this.vy > 0) {
      this.y += this.vy;
      this.vy -= GRAV;
      if (this.y <= 0) this.land();
    }
  }

  private land() {
    this.y = 0;
    this.vy = 0;
    if (this.state === 'launched') {
      this.vx = 0;
      this.setState('down', 'lie');
    } else if (this.state === 'jump' || (this.state === 'attack' && this.move?.air)) {
      this.vx = 0;
      this.move = null;
      this.setState('idle', 'stand');
    }
  }

  /** Face the opponent when free to turn. */
  faceOpponent() {
    if (this.airborne || !['idle', 'walk', 'crouch', 'block'].includes(this.state)) return;
    const f = this.opp.x >= this.x ? 1 : -1;
    if (f !== this.facing) {
      this.facing = f;
      if (this.state === 'idle') this.setTag('turn');
    }
  }
}
