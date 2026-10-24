import { STANDARD_MOVES } from '../../fight/moves';
import type { FighterDef } from '../../fight/types';
import type { Tag } from '../../sprites/sheet';
import ANIMS from './animations.json';

// The chef, the first pilot character with real art (docs/characters/chef.md).
//
// Frame order and timing come straight from the art delivery's animations.json (docs/ART_SPEC.md,
// section 5), copied here so the frame data is reviewed and tested like code. Effects (fx-*) are
// separate animations, not fighter tags.

type Anim = { frames: [string, number][]; loop?: boolean };

const tags: Record<string, Tag> = {};
for (const [id, a] of Object.entries(ANIMS as unknown as Record<string, Anim>)) {
  if (id.startsWith('fx-')) continue;
  tags[id] = { frames: a.frames.map(([f, t]) => [`${id}/${f}`, t]), loop: a.loop ?? false };
}
// air attacks hold their last frame until landing: pad them to the shared air-move length (35)
for (const id of ['jp', 'jk']) {
  const f = tags[id].frames;
  const before = f.slice(0, -1).reduce((n, [, t]) => n + t, 0);
  f[f.length - 1] = [f[f.length - 1][0], 35 - before];
}
// standing back up from the crouch plays the crouch backwards
tags.stand = { frames: [...tags.crouch.frames].reverse() };

export const CHEF_TAGS = tags;

export const CHEF: FighterDef = {
  id: 'chef',
  name: 'Chef',
  sheetUrl: 'fighters/chef/sheet.json',
  tags: CHEF_TAGS,
  moves: STANDARD_MOVES,
  walk: 8.8,
  walkBack: 7.2,
};
