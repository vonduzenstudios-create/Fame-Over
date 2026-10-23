import { EMPTY, RawInput } from '../src/core/input';
import { Fight } from '../src/fight/fight';
import { Fighter } from '../src/fight/fighter';
import { RAMSAY } from '../src/fighters/ramsay/fighter';
import { placeholderData } from '../src/sprites/placeholder';

export const press = (o: Partial<RawInput>): RawInput => ({ ...EMPTY, ...o });

/** A Gordon mirror match on placeholder data, skipped past the round intro. */
export function newFight(skipIntro = true) {
  const data = placeholderData(RAMSAY.tags);
  const f = new Fight([new Fighter(RAMSAY, data, 0, 0), new Fighter(RAMSAY, data, 1, 0)]);
  if (skipIntro) while (f.phase !== 'fight') f.step([EMPTY, EMPTY]);
  return f;
}

/** Put the fighters `gap` pixels apart, facing each other. */
export function standApart(f: Fight, gap: number) {
  f.f[0].x = 400;
  f.f[1].x = 400 + gap;
  for (const g of f.f) g.faceOpponent();
}

export function run(f: Fight, n: number, a: RawInput = EMPTY, b: RawInput = EMPTY) {
  for (let i = 0; i < n; i++) f.step([a, b]);
}
