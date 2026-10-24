import { STANDARD_MOVES } from '../../fight/moves';
import type { FighterDef } from '../../fight/types';
import { Anim, tagsFromArt } from '../fromArt';
import ANIMS from './animations.json';

// The chef (docs/characters/chef.md). Frame order and timing are the art delivery's animations.json,
// copied here so the frame data is reviewed and tested like code.

export const CHEF: FighterDef = {
  id: 'chef',
  name: 'Chef',
  sheetUrl: 'fighters/chef/sheet.json',
  tags: tagsFromArt(ANIMS as unknown as Record<string, Anim>),
  moves: STANDARD_MOVES,
  walk: 8.8,
  walkBack: 7.2,
};
