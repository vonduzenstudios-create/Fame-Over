// Internal pixel resolution. 16:9, scaled up by a whole number so pixels stay sharp
// (x4 = 1920x1080). Fighters are drawn about 130 px tall, the same proportions as mid-90s arcade fighters.
export const W = 480;
export const H = 270;
/** Screen y of the floor the fighters stand on. */
export const FLOOR = 252;
export const STAGE_W = 960;
export const GRAV = 0.55;
export const MAX_HP = 1000;
export const ROUND_TIME = 99;
/** Closest two fighters' feet can get, in pixels. */
export const MIN_GAP = 40;
