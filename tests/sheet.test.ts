import { describe, expect, it } from 'vitest';
import { frameIndexAt, overlap, tagLength, worldBox } from '../src/sprites/sheet';

describe('sprite tags', () => {
  const tag = { frames: [['a', 2], ['b', 3], ['c', 1]] as [string, number][] };
  it('holds each frame for its ticks', () => {
    expect(tagLength(tag)).toBe(6);
    expect([0, 1, 2, 3, 4, 5].map((t) => frameIndexAt(tag, t))).toEqual([0, 0, 1, 1, 1, 2]);
  });
  it('holds the last frame of a one-shot and wraps a loop', () => {
    expect(frameIndexAt(tag, 20)).toBe(2);
    expect(frameIndexAt({ ...tag, loop: true }, 7)).toBe(0);
  });
  it('mirrors boxes for a fighter facing left', () => {
    const b = { x: 10, y: -50, w: 20, h: 10 };
    expect(worldBox(b, 100, 200, 1)).toEqual({ x: 110, y: 150, w: 20, h: 10 });
    expect(worldBox(b, 100, 200, -1)).toEqual({ x: 70, y: 150, w: 20, h: 10 });
    expect(overlap(worldBox(b, 100, 200, 1), { x: 125, y: 155, w: 5, h: 5 })).toBe(true);
  });
});
