import type { Tag } from '../sprites/sheet';

/** One entry of an art delivery's animations.json (docs/ART_SPEC.md, section 5). */
export type Anim = { frames: [string, number][]; loop?: boolean; impact?: number };

/**
 * A fighter's tags from the art delivery's animations.json: frame "<anim>/<nn>" held for its ticks.
 * Effects (fx-*) are separate animations, not fighter tags. Animations the delivery doesn't have yet
 * borrow a stand-in from the ones it does, so a partly finished set is still playable.
 */
export function tagsFromArt(anims: Record<string, Anim>): Record<string, Tag> {
  const tags: Record<string, Tag> = {};
  for (const [id, a] of Object.entries(anims)) {
    if (id.startsWith('fx-')) continue;
    tags[id] = { frames: a.frames.map(([f, t]) => [`${id}/${f}`, t]), loop: a.loop ?? false };
  }
  // air attacks hold their last frame until landing: pad them to the shared air-move length (35)
  for (const id of ['jp', 'jk']) {
    const f = tags[id]?.frames;
    if (!f) continue;
    const before = f.slice(0, -1).reduce((n, [, t]) => n + t, 0);
    f[f.length - 1] = [f[f.length - 1][0], 35 - before];
  }
  // standing back up from the crouch plays the crouch backwards
  if (tags.crouch) tags.stand = { frames: [...tags.crouch.frames].reverse() };
  // stand-ins for animations not delivered yet
  const idle = tags.idle;
  tags.ko ??= tags.knockdown && tags.lie ? { frames: [...tags.knockdown.frames, ...tags.lie.frames] } : idle;
  tags.dizzy ??= idle;
  tags.victory ??= idle;
  tags.intro ??= idle;
  return tags;
}
