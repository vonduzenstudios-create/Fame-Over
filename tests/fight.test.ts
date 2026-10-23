import { describe, expect, it } from 'vitest';
import { EMPTY, RawInput } from '../src/core/input';
import { MAX_HP } from '../src/core/consts';
import { rng } from '../src/core/rng';
import { newFight, press, run, standApart } from './helpers';

describe('fight', () => {
  it('a jab up close hits', () => {
    const f = newFight();
    standApart(f, 200);
    f.step([press({ lp: true }), EMPTY]);
    run(f, 20);
    expect(f.f[1].hp).toBeLessThan(MAX_HP);
  });

  it('a jab from across the screen whiffs', () => {
    const f = newFight();
    standApart(f, 800);
    f.step([press({ lp: true }), EMPTY]);
    run(f, 20);
    expect(f.f[1].hp).toBe(MAX_HP);
  });

  it('holding back blocks a high attack but not a low one', () => {
    const f = newFight();
    standApart(f, 200);
    const back = press({ r: true }); // P2 faces left, so right is back
    f.step([press({ hp: true }), back]);
    run(f, 20, EMPTY, back);
    expect(f.f[1].hp).toBe(MAX_HP);
    run(f, 30, EMPTY, back);
    standApart(f, 200);
    f.step([press({ d: true, lk: true }), back]);
    run(f, 20, press({ d: true }), back);
    expect(f.f[1].hp).toBeLessThan(MAX_HP);
  });

  it('an uppercut launches, the opponent lands, lies down and gets back up', () => {
    const f = newFight();
    standApart(f, 200);
    f.step([press({ d: true, hp: true }), EMPTY]);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      f.step([press({ d: true }), EMPTY]);
      seen.add(f.f[1].state);
    }
    expect([...seen]).toEqual(expect.arrayContaining(['launched', 'down', 'getup', 'idle']));
    expect(f.f[1].hp).toBe(MAX_HP - 130);
  });

  it('a knockout ends the round and two round wins end the match', () => {
    const f = newFight();
    f.f[1].hp = 1;
    standApart(f, 200);
    f.step([press({ lp: true }), EMPTY]);
    run(f, 20);
    expect(f.phase).toBe('ko');
    expect(f.wins).toEqual([1, 0]);
    run(f, 300);
    expect(f.round).toBe(2);
  });

  it('is deterministic: the same inputs give the same fight', () => {
    const play = () => {
      const f = newFight(false);
      const r = rng(42);
      const keys: (keyof RawInput)[] = ['l', 'r', 'u', 'd', 'lp', 'hp', 'lk', 'hk', 'bl'];
      const rand = (): RawInput => {
        const o: any = { ...EMPTY };
        for (const k of keys) o[k] = r.next() < 0.15;
        return o;
      };
      for (let i = 0; i < 3000; i++) f.step([rand(), rand()]);
      return f.hash();
    };
    expect(play()).toBe(play());
  });
});
