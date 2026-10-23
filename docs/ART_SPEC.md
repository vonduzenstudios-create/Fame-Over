# Fame Over character art spec

What the game engine needs from a character's art. Hand this to whatever makes the art (a person, a 3D rig,
an image tool) as the engine compatibility specification. It lists functions and technical limits only; it
is not a pose or timing reference from any other game.

## Canvas and scale

- Game screen: 480x270 pixels, scaled up by whole numbers (x4 = 1920x1080). Draw at final size, never
  upscaled or downscaled per frame.
- Standing character height: about 130 px (top of head to soles).
- **Every frame uses the same canvas: 192x192 px, transparent.**
- **Pivot (feet anchor): x=96, y=184.** The point between the feet sits there on every frame where the
  character stands, crouches or attacks on the ground. Lying, falling and airborne frames keep the same
  pivot as "where the feet would touch the floor".
- Character faces **right** on every frame. The game mirrors it for the other side, so avoid lettering or
  one-sided logos that would read backwards.
- Animate **in place**. The game moves the character itself: walks don't travel across the canvas, jumps
  and flips stay low on the canvas (the game adds the height). Knockdowns may slide a little, but end with
  the body over the pivot.
- No baked shadow, floor, motion blur or background. The game draws the shadow.

## Pixels and colour

- Hard alpha only: every pixel fully opaque or fully transparent. No soft edges or semi-transparent fringe.
- Limited palette, about 48 colours or fewer, and the same palette on every frame.
- Keep each costume area on its own small colour ramp (for example jacket: 5 whites/greys, trousers: 4
  darks, skin: 5, hair: 4). The game recolours those ramps for the second player in a mirror match.
- One consistent light direction across the whole set.

## Animations

One folder per animation, named with the engine's id: `frames/<id>/01.png`, `02.png`, ... in play order.
Frame counts are guides; fewer good frames beat many inconsistent ones. Attack frame counts are art only:
the game sets when a hit lands, so mark the impact frame instead (see animations.json below).

| id | What | Frames | Notes |
| --- | --- | --- | --- |
| idle | fighting stance | 6-10 | seamless loop |
| turn | turning to face the other way | 2 | ends in stance |
| walk | walking forward | 8-10 | seamless loop; walking back plays it reversed |
| crouch | ducking down | 3 | last frame is the crouch hold |
| jump | straight jump | 3 | take-off, rising, falling |
| flip | forward/back jump somersault | 6-8 | |
| lp | light punch to the stomach | 4-5 | |
| hp | fast punch to the face | 4-5 | |
| cp | crouching punch | 3-4 | from the crouch hold |
| uppercut | crouch to rising uppercut | 5-6 | launches the opponent |
| jp | air punch | 2-3 | from the jump pose |
| lk | mid kick | 4-5 | |
| hk | high kick | 4-5 | |
| roundhouse | spinning high kick | 6-9 | knocks down |
| ck | crouching kick | 4-5 | low |
| sweep | crouching leg sweep | 6-8 | knocks down |
| jk | air kick | 2-3 | |
| throw | grab and throw | 5-7 | |
| thrown | being thrown | 5-6 | |
| block | standing guard | 2-3 | last frame held |
| cblock | crouching guard | 2-3 | last frame held |
| hitHigh | hit in the face | 3 | returns to stance |
| hitMid | hit in the stomach | 3 | returns to stance |
| hitCrouch | hit while crouched | 3 | returns to crouch |
| launched | knocked into the air | 4 | last frame held while flying |
| knockdown | swept or knocked off the feet | 4 | |
| lie | landing flat on the back | 3-4 | last frame held |
| getup | getting up | 4-5 | last frame matches idle frame 1 |
| ko | collapsing, knocked out | 6-8 | |
| dizzy | stunned and swaying | 6-8 | seamless loop |
| victory | round win | 8-12 | |
| intro | entrance before round 1 | 6-12 | ends in idle |

Also, as single images:
- `portrait.png` 64x64, head and shoulders facing right (select screen, health bar).
- `select.png` up to 192x192, the character-select pose (can reuse an idle frame at first).

Effects that leave the body (blowtorch flame, a thrown pan, sparks) go in their own folder,
`frames/fx-<name>/`, on their own canvas, not painted into the body frames.

## Files

```
<Character>/
  frames/<id>/01.png ...
  portrait.png
  select.png
  animations.json
  palette.png        (one pixel per colour, optional but helps the P2 recolour)
```

`animations.json` gives each animation's order, how long each frame shows (in game frames, 60 a second),
and for attacks which frame index is the impact:

```json
{
  "idle": { "frames": [["01", 6], ["02", 6], ["03", 6]], "loop": true },
  "lp":   { "frames": [["01", 2], ["02", 2], ["03", 4], ["04", 3]], "impact": 2 }
}
```

The game turns the frames into one packed sheet with `scripts/import_sheets.py`, which also suggests hit and
hurt boxes; those are then checked and adjusted in the sprite viewer (`?viewer`).
