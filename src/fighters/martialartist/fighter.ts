import { STANDARD_MOVES } from '../../fight/moves';
import type { FighterDef } from '../../fight/types';
import { Anim, tagsFromArt } from '../fromArt';
import ANIMS from './animations.json';

// The martial artist (docs/characters/martial-artist.md). Frame order and timing are the art
// delivery's animations.json. Planted and deliberate, so a touch slower on his feet than the chef.

export const MARTIAL_ARTIST: FighterDef = {
  id: 'martialartist',
  name: 'Martial Artist',
  sheetUrl: 'fighters/martialartist/sheet.json',
  tags: tagsFromArt(ANIMS as unknown as Record<string, Anim>),
  moves: STANDARD_MOVES,
  walk: 8.2,
  walkBack: 7.0,
};
