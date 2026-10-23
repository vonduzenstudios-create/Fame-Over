import type { Box, Tag } from '../sprites/sheet';

export type Level = 'high' | 'mid' | 'low';
/** light: short flinch, chains into another light. heavy: longer flinch. launch: pops up into the air. knockdown: falls down. */
export type Effect = 'light' | 'heavy' | 'launch' | 'knockdown';
export type Btn = 'lp' | 'hp' | 'lk' | 'hk';

/**
 * An attack. Timing lives here, not in the art: `active` is the [first, last) game frame the attack
 * can connect, counted from the start of its tag. tests/moves.test.ts pins these numbers.
 */
export interface Move {
  id: string;
  tag: string;
  active: [number, number];
  dmg: number;
  level: Level;
  effect: Effect;
  /** Frames the opponent is stuck reeling on hit (blockstun is about two thirds of it). */
  stun: number;
  /** How far the hit shoves the opponent back. */
  push: number;
  /** Fallback hitbox, used on active frames whose art carries no hitbox of its own. */
  box: Box;
  air?: boolean;
  crouch?: boolean;
  /** Launch arc for effect 'launch': [upward speed, speed away]. */
  lift?: [number, number];
  /** Forward speed while the move plays. */
  vx?: number;
}

/** Everything that makes one fighter: their animations, moves and walk speed. */
export interface FighterDef {
  id: string;
  name: string;
  /** Sheet data URL for the real art, tried first. Missing art falls back to the generated placeholder. */
  sheetUrl?: string;
  tags: Record<string, Tag>;
  moves: Record<string, Move>;
  walk: number;
  walkBack: number;
}
