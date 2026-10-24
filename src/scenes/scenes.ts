import { FLOOR, H, MAX_HP, W } from '../core/consts';
import { Edge, EMPTY, readPlayer, RawInput } from '../core/input';
import { sfx } from '../audio/sfx';
import { AI } from '../fight/ai';
import { Fight } from '../fight/fight';
import { Fighter } from '../fight/fighter';
import type { FighterDef } from '../fight/types';
import { FIGHTERS, sheetFor } from '../fighters/registry';
import { drawText } from '../gfx/font';
import { drawFrame, Sheet, simData, tagLength, frameNameAt, worldBox } from '../sprites/sheet';
import { drawKitchen } from '../stages/kitchen';

/** Menus and the HUD are laid out in a quarter-size space (480x270) and drawn scaled up 4x. */
const UW = 480, UH = 270;
function ui(ctx: CanvasRenderingContext2D, f: () => void) {
  ctx.save();
  ctx.scale(W / UW, H / UH);
  ctx.imageSmoothingEnabled = false;
  f();
  ctx.restore();
}

export interface Scene {
  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface App {
  go(s: Scene): void;
  /** Show hurtboxes (blue) and hitboxes (red). Toggle with F2. */
  boxes: boolean;
}

// ---------------------------------------------------------------- title

export class TitleScene implements Scene {
  private e = new Edge();
  private sel = 0;
  private t = 0;
  private items = ['1P VS CPU', '2P VERSUS'];
  constructor(private app: App) {}

  update() {
    this.t++;
    const p = this.e.update(readPlayer(0, true));
    if (p.u || p.d) {
      this.sel = (this.sel + 1) % this.items.length;
      sfx.select();
    }
    if (p.start || p.lp) {
      sfx.gong();
      this.app.go(new SelectScene(this.app, this.sel === 0));
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawKitchen(ctx, 960 + Math.sin(this.t / 200) * 800, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ui(ctx, () => this.drawMenu(ctx));
  }

  private drawMenu(ctx: CanvasRenderingContext2D) {
    const W = UW;
    drawText(ctx, 'FAME OVER', W / 2, 60, '#fff', { scale: 6, align: 'center', grad: ['#ffe070', '#e03010'], outline: '#200', shadow: '#000' });
    this.items.forEach((s, i) => {
      const on = i === this.sel;
      drawText(ctx, (on ? '> ' : '  ') + s, W / 2, 160 + i * 18, on ? '#ffe070' : '#aaa', { scale: 2, align: 'center', shadow: '#000' });
    });
    drawText(ctx, 'ENTER OR START', W / 2, 240, '#888', { align: 'center' });
  }
}

// ---------------------------------------------------------------- character select

/**
 * Each player moves a cursor over the roster with left/right and picks with a punch. Against the CPU,
 * the CPU takes the next fighter along once player 1 has picked. Back returns to the title.
 */
export class SelectScene implements Scene {
  private e = [new Edge(), new Edge()];
  private cur: [number, number] = [0, Math.min(1, FIGHTERS.length - 1)];
  private done: [boolean, boolean] = [false, false];
  private sheets: Sheet[] | null = null;
  private t = 0;
  private wait = -1;
  constructor(private app: App, private vsCpu: boolean) {
    Promise.all(FIGHTERS.map(sheetFor)).then((s) => (this.sheets = s));
  }

  update() {
    this.t++;
    if (!this.sheets) return;
    if (this.wait >= 0) {
      if (this.wait-- === 0) startFight(this.app, FIGHTERS[this.cur[0]], FIGHTERS[this.cur[1]], this.vsCpu);
      return;
    }
    const n = FIGHTERS.length;
    for (const side of [0, 1] as const) {
      if (side === 1 && this.vsCpu) continue;
      const p = this.e[side].update(readPlayer(side, this.vsCpu));
      if (p.back) return this.app.go(new TitleScene(this.app));
      if (this.done[side]) continue;
      if (p.l || p.r) {
        this.cur[side] = (this.cur[side] + (p.r ? 1 : n - 1)) % n;
        sfx.select();
      }
      if (p.lp || p.hp || p.start) {
        this.done[side] = true;
        sfx.gong();
        if (this.vsCpu) {
          this.cur[1] = (this.cur[0] + 1) % n;
          this.done[1] = true;
        }
      }
    }
    if (this.done[0] && this.done[1]) this.wait = 40;
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawKitchen(ctx, 960, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    const n = FIGHTERS.length;
    const gap = 560;
    const x0 = W / 2 - ((n - 1) * gap) / 2;
    FIGHTERS.forEach((def, i) => {
      const x = x0 + i * gap;
      const on = this.cur.map((c, s) => c === i && (s === 0 || !this.vsCpu || this.done[0]));
      if (on[0] || on[1]) {
        ctx.fillStyle = on[0] && on[1] ? 'rgba(255,224,112,0.18)' : on[0] ? 'rgba(255,80,60,0.2)' : 'rgba(80,140,255,0.2)';
        ctx.fillRect(x - 240, 300, 480, 680);
      }
      if (this.sheets) drawFrame(ctx, this.sheets[i], 'idle/01', x, 900, i % 2 === 0 ? 1 : -1);
    });
    ui(ctx, () => {
      drawText(ctx, 'CHOOSE YOUR FIGHTER', UW / 2, 20, '#fff', { scale: 3, align: 'center', grad: ['#ffe070', '#e03010'], outline: '#200' });
      FIGHTERS.forEach((def, i) => {
        const x = (x0 + i * gap) / 4;
        drawText(ctx, def.name.toUpperCase(), x, 236, '#fff', { scale: 2, align: 'center', shadow: '#000' });
        const tags: string[] = [];
        if (this.cur[0] === i) tags.push(this.done[0] ? '1P OK' : '1P');
        if (this.cur[1] === i && (!this.vsCpu || this.done[0])) tags.push(this.vsCpu ? 'CPU' : this.done[1] ? '2P OK' : '2P');
        drawText(ctx, tags.join('  '), x, 64, '#ffe070', { scale: 2, align: 'center', shadow: '#000' });
      });
      if (!this.sheets) drawText(ctx, 'LOADING', UW / 2, 130, '#fff', { scale: 2, align: 'center' });
    });
  }
}

async function startFight(app: App, a: FighterDef, b: FighterDef, vsCpu: boolean) {
  const [sa, sb] = await Promise.all([sheetFor(a), sheetFor(b)]);
  app.go(new FightScene(app, [a, b], [sa, sb], vsCpu));
}

// ---------------------------------------------------------------- fight

export class FightScene implements Scene {
  fight: Fight;
  private ai: AI | null;
  private e = new Edge();
  private banner = '';
  private bannerT = 0;
  private shake = 0;
  private sparks: { x: number; y: number; t: number; heavy: boolean; block: boolean }[] = [];

  constructor(private app: App, defs: [FighterDef, FighterDef], private sheets: [Sheet, Sheet], vsCpu: boolean) {
    const f0 = new Fighter(defs[0], simData(sheets[0]), 0, 0);
    const f1 = new Fighter(defs[1], simData(sheets[1]), 1, 0);
    this.fight = new Fight([f0, f1]);
    this.ai = vsCpu ? new AI(1234) : null;
    this.onEvents();
  }

  update() {
    const f = this.fight;
    if (f.phase === 'over') {
      const p = this.e.update(readPlayer(0, true));
      if (f.phaseT++ > 60 && (p.start || p.lp)) this.app.go(new TitleScene(this.app));
      return;
    }
    const p1 = readPlayer(0, !!this.ai);
    const p2: RawInput = this.ai ? this.ai.read(f.f[1]) : readPlayer(1, false);
    f.step([p1, f.phase === 'fight' ? p2 : EMPTY]);
    this.onEvents();
    if (this.bannerT > 0) this.bannerT--;
    if (this.shake > 0) this.shake--;
    for (const s of this.sparks) s.t++;
    this.sparks = this.sparks.filter((s) => s.t < 12);
  }

  private onEvents() {
    for (const e of this.fight.events) {
      switch (e.t) {
        case 'hit':
          sfx.hit(e.heavy);
          this.sparks.push({ x: e.x, y: e.y, t: 0, heavy: e.heavy, block: false });
          if (e.heavy) this.shake = 8;
          break;
        case 'block':
          sfx.block();
          this.sparks.push({ x: e.x, y: e.y, t: 0, heavy: false, block: true });
          break;
        case 'whoosh':
          sfx.whoosh();
          break;
        case 'round':
          this.say(`ROUND ${e.n}`, 90);
          break;
        case 'fight':
          this.say('FIGHT!', 50);
          sfx.gong();
          break;
        case 'ko':
          this.say(this.fight.timer <= 0 ? 'TIME' : 'K.O.', 120);
          break;
        case 'winner':
          this.say(`${this.fight.f[e.side === 1 ? 1 : 0].def.name} WINS`, 9999);
          break;
      }
    }
  }

  private say(s: string, t: number) {
    this.banner = s;
    this.bannerT = t;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const f = this.fight;
    const cam = f.camX;
    const sx = this.shake ? ((this.shake % 2) * 2 - 1) * 2 : 0;
    ctx.save();
    ctx.translate(sx, 0);
    drawKitchen(ctx, cam, f.t);
    // shadows, then fighters (the attacker drawn in front)
    for (const g of f.f) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      const w = Math.max(64, 176 - g.y * 0.2);
      ctx.beginPath();
      ctx.ellipse(g.x - cam, FLOOR + 4, w / 2, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const order = f.f[0].state === 'attack' ? [1, 0] : [0, 1];
    for (const i of order) {
      const g = f.f[i];
      drawFrame(ctx, this.sheets[i], g.frameName, g.x - cam, g.screenY, g.facing);
      if (this.app.boxes) this.drawBoxes(ctx, g, cam);
    }
    for (const s of this.sparks) {
      ctx.fillStyle = s.block ? '#9cf' : s.heavy ? '#fff2a0' : '#fff';
      const r = (s.heavy ? 56 : 36) * (1 - s.t / 12);
      ctx.fillRect(s.x - cam - r, s.y - 6, r * 2, 12);
      ctx.fillRect(s.x - cam - 6, s.y - r, 12, r * 2);
    }
    ctx.restore();
    this.drawHud(ctx);
  }

  private drawBoxes(ctx: CanvasRenderingContext2D, g: Fighter, cam: number) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4af';
    for (const b of g.hurtboxes()) ctx.strokeRect(b.x - cam + 2, b.y + 2, b.w - 4, b.h - 4);
    const hb = g.hitbox();
    if (hb) {
      ctx.strokeStyle = '#f33';
      ctx.strokeRect(hb.x - cam + 2, hb.y + 2, hb.w - 4, hb.h - 4);
    }
    ctx.fillStyle = '#ff0';
    ctx.fillRect(g.x - cam - 6, g.screenY - 6, 12, 12);
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    ui(ctx, () => this.drawHudSmall(ctx));
  }

  private drawHudSmall(ctx: CanvasRenderingContext2D) {
    const W = UW;
    const f = this.fight;
    const BW = 190;
    f.f.forEach((g, i) => {
      const x = i === 0 ? 12 : W - 12 - BW;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, 11, BW + 2, 12);
      ctx.fillStyle = '#a01010';
      ctx.fillRect(x, 12, BW, 10);
      const w = Math.round((BW * g.hp) / MAX_HP);
      ctx.fillStyle = '#30d040';
      ctx.fillRect(i === 0 ? x : x + BW - w, 12, w, 10);
      drawText(ctx, g.def.name, i === 0 ? x : x + BW, 27, '#fff', { align: i === 0 ? 'left' : 'right', shadow: '#000' });
      for (let k = 0; k < f.wins[i]; k++) {
        ctx.fillStyle = '#ffe070';
        ctx.fillRect(i === 0 ? x + k * 10 : x + BW - 8 - k * 10, 38, 7, 7);
      }
    });
    drawText(ctx, String(Math.max(0, Math.ceil(f.timer / 60))), W / 2, 10, '#fff', { scale: 2, align: 'center', shadow: '#000' });
    if (this.bannerT > 0) drawText(ctx, this.banner, W / 2, 100, '#fff', { scale: 4, align: 'center', grad: ['#ffe070', '#e03010'], outline: '#200' });
    if (f.phase === 'over' && f.phaseT > 60) drawText(ctx, 'PRESS START', W / 2, 150, '#fff', { align: 'center', shadow: '#000' });
  }
}

// ---------------------------------------------------------------- sprite viewer

/**
 * Plays any of a fighter's animations tick by tick with its boxes drawn on top, for checking new
 * art. Open the game with ?viewer. Left/right: animation, up/down: speed, LP: pause, HP: step.
 */
export class ViewerScene implements Scene {
  private e = new Edge();
  private names: string[];
  private i = 0;
  private t = 0;
  private paused = false;
  private speed = 1;
  constructor(private def: FighterDef, private sheet: Sheet) {
    this.names = Object.keys(def.tags);
  }

  update() {
    const p = this.e.update(readPlayer(0, true));
    if (p.r || p.l) {
      this.i = (this.i + (p.r ? 1 : this.names.length - 1)) % this.names.length;
      this.t = 0;
    }
    if (p.u) this.speed = Math.min(1, this.speed * 2);
    if (p.d) this.speed = Math.max(1 / 8, this.speed / 2);
    if (p.lp) this.paused = !this.paused;
    if (!this.paused) this.t += this.speed;
    else if (p.hp) this.t++;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#334';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#556';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    const name = this.names[this.i];
    const tag = this.def.tags[name];
    const tick = Math.floor(this.t);
    const len = tagLength(tag);
    const fr = frameNameAt(tag, tag.loop ? tick : Math.min(tick, len - 1));
    if (!tag.loop && tick > len + 30) this.t = 0;
    const x = W / 2;
    drawFrame(ctx, this.sheet, fr, x, FLOOR, 1);
    const f = simData(this.sheet).frames[fr];
    if (f) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#4af';
      for (const b of f.hurt) {
        const w = worldBox(b, x, FLOOR, 1);
        ctx.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
      }
      const m = Object.values(this.def.moves).find((m) => m.tag === name);
      const active = m && tick >= m.active[0] && tick < m.active[1];
      if (m && active) {
        const w = worldBox(f.hit ?? m.box, x, FLOOR, 1);
        ctx.strokeStyle = '#f33';
        ctx.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
      }
    }
    ui(ctx, () => {
      drawText(ctx, `${this.def.name}  ${name}  (${this.i + 1}/${this.names.length})`, 8, 8, '#fff');
      drawText(ctx, `TICK ${Math.min(tick, len)}/${len}  FRAME ${fr}  ${this.paused ? 'PAUSED' : `SPEED ${this.speed}`}`, 8, 20, '#ccc');
      drawText(ctx, 'LEFT/RIGHT ANIM  UP/DOWN SPEED  LP PAUSE  HP STEP', 8, UH - 12, '#aaa');
    });
  }
}

export async function viewerFor(def: FighterDef) {
  return new ViewerScene(def, await sheetFor(def));
}
