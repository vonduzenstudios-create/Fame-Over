# Fame Over character art spec (v2)

What the Fame Over engine needs from a character's art. Give this to whoever makes the art (a person, a 3D
rig, an image-generation agent) as the **engine compatibility specification**. It covers functions and
technical delivery only. It is not a pose, motion or timing reference from any other game, and it does not
describe how the character looks: pair it with that character's approved design reference and written
character brief.

v2 (2026-10-23): native 1080p and full colour, plus answers to the review of v1. Each character also gets
its own brief (look, personality, signature prop and where it's stowed, which attacks use it, specials),
written before any art is made.

## 1. Resolution and scale

- The game renders natively at **1920x1080** and scales the whole picture to fit the window.
- **Standing character height: about 500 px** (top of hair to soles), roughly 46% of the screen height.
  The approved stance pilot is the size reference.
- **One shared scale for the whole character.** Production art may be made at a higher resolution, but the
  complete set is reduced to the final size with one scale factor. Never resize frames one by one to fit
  their bounding box: that makes the character change size between frames.
- Enlarged previews (GIFs, galleries) may use any scaling; they are not game assets.

## 2. Canvas, pivot and facing

- **Every frame: 768x768 px, transparent PNG (RGBA, 8 bits per channel).**
- **Pivot: x=384, y=736.** The pivot is a fixed character/world origin, *not* the lowest visible pixel.
  On the ground, the point midway between the feet sits on it. In the air or while falling, the pivot
  stays where the feet would touch the floor, and the body is placed relative to it as authored.
- **Never bottom-align or re-centre airborne, falling or lying poses.** Keep authored offsets. If a pose
  would leave the 768x768 canvas, flag that frame instead of shrinking or shifting it.
- **Facing:** every action is performed toward screen right (the opponent's side). Spins, flips and hit
  reactions may show the back or side. The engine mirrors the whole frame for a character on the right,
  so avoid lettering or one-sided logos that read backwards.
- **`turn`:** plays when the opponent crosses over. The engine flips the mirror on the turn's first frame,
  so draw it as: starts facing away (toward screen left) and ends in the idle stance facing right.
- **Animate in place.** The engine moves the character: walks don't travel, jumps and flips stay near the
  pivot (the engine adds height), and knockdowns may slide a little but end over the pivot.
- No baked shadow, floor, background, motion blur or camera shake. The engine draws the shadow.

## 3. Colour and edges

- **Full colour, no palette limit.** Keep the photographic shading of the approved pilot.
- **Lighting, the same for every character so they match on one stage:** key light from the front-left
  and above (from screen left, about 45 degrees up, slightly toward the camera), a soft cool fill from the
  right, no hard rim light. The engine mirrors characters on the right side, which flips their light;
  that is expected.
- Edges may be soft (anti-aliased alpha). **No coloured halo or fringe:** the edge pixels must carry the
  character's own colours, not the generator's background (check dark trousers and shoes especially).
- Colour should not drift between frames or animations (skin, jacket white, scarf red, wood of props).
- **Player 2 colours:** the engine does not swap palettes. For mirror matches it applies its own tint to
  the finished frames, so no extra art is needed. (If we later want a true alternate outfit, it will be a
  separate full set in an `alt/` folder; not part of this delivery.)

## 4. Animations

One folder per animation, named with the engine's id: `frames/<id>/01.png`, `02.png`, ... in play order.

**Speed vs smoothness.** The game must play at the speed of a mid-90s arcade fighter. The engine owns
the speed: it sets how long each move lasts, and the art fills that time. The frame counts below are
already a little above that era's (roughly 1.25x) for smoother motion; going higher doesn't make a move
slower, it only adds in-betweens. Never stretch an attack's wind-up to show more frames: put the extra
frames into follow-through and recovery instead. Fewer clean, consistent frames beat many inconsistent ones.
The engine decides when an attack can hit, so attack frame counts are art only: mark the impact frame.

**Fighting style and props.** Every character fights with punches and kicks: all the standard attacks
below are unarmed. A signature prop (for example a chef's rolling pin) is used only in the specific
attacks the character brief names, the way a baton fighter pulls it for a few moves. The rest of the
time it stays stowed in one fixed place on the body (belt, holster or back), the same on every frame.
The character brief says where it's stowed and which attacks use it.

| id | What | Frames | Notes |
| --- | --- | --- | --- |
| idle | fighting stance, fists up | 8-10 | seamless loop |
| turn | turning to face the other way | 2-3 | see Facing |
| walk | walking forward | 8-10 | seamless loop; walking back plays it reversed |
| crouch | ducking down | 3 | last frame is the crouch hold |
| jump | straight jump | 3 | take-off, rising, falling |
| flip | forward/back somersault | 6-8 | |
| lp | light punch to the stomach | 4-5 | |
| hp | fast punch to the face | 4-5 | |
| cp | crouching punch | 3-4 | starts from the crouch hold |
| uppercut | rising uppercut from a crouch | 5-6 | launches the opponent |
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
| hitHigh | hit in the face | 3 | returns toward idle frame 1 |
| hitMid | hit in the stomach | 3 | returns toward idle frame 1 |
| hitCrouch | hit while crouched | 3 | returns to the crouch hold |
| launched | knocked into the air | 4 | last frame held while flying |
| knockdown | swept or knocked off the feet | 4 | |
| lie | landing flat on the back | 3-4 | last frame held |
| getup | getting up | 4-5 | last frame matches idle frame 1 |
| ko | collapsing, knocked out | 6-8 | last frame held |
| dizzy | stunned and swaying | 6-8 | seamless loop |
| victory | round win | 8-12 | last frame held |
| intro | entrance before round 1 | 6-12 | ends in idle frame 1 |

Single images, same colour and edge rules:
- `portrait.png`: 256x256, head and shoulders facing right (select screen, health bar).
- `select.png`: 768x768 on the standard canvas and pivot, the character-select pose (an idle frame is fine at first).

## 5. animations.json

```json
{
  "idle":  { "frames": [["01", 6], ["02", 6], ["03", 6]], "loop": true },
  "lp":    { "frames": [["01", 2], ["02", 2], ["03", 4], ["04", 3]], "impact": 2 },
  "hk":    { "frames": [["01", 3], ["02", 3], ["03", 5], ["04", 4]], "impact": 2,
             "fx": [{ "id": "fx-swoosh", "frame": 1, "x": 180, "y": -420 }] }
}
```

- Frame entries are `[file name without .png, ticks]`. **Ticks are integer game frames at 60 per second,
  minimum 1.** (A 120 ms preview frame is about 7 ticks.)
- `impact` is the **zero-based** index into `frames` of the frame where the strike lands (2 = the third entry).
- `loop` defaults to `false`. A non-looping animation **holds its last frame** until the engine moves on.
- Every animation folder needs an entry. Frames may repeat inside an animation (e.g. `["02", 2]` twice).

## 6. Effects (FX)

- Anything that leaves the body or glows (blowtorch flame, sparks, a thrown pan, steam) is its own
  animation in `frames/fx-<name>/`, never painted into body frames.
- FX frames use a 384x384 canvas with their own pivot at the centre (192, 192), unless an FX's
  `animations.json` entry gives `"pivot": [x, y]`.
- Same colour and edge rules as the body. Additive glow is allowed only if marked `"blend": "add"`.
- An attack spawns an FX with `"fx": [{ "id", "frame", "x", "y" }]` in its animation entry: `frame` is the
  zero-based frame index it appears on, and `x, y` place the FX pivot relative to the body pivot (facing
  right, y negative upward). The engine mirrors it with the body.

## 7. Delivery and engine import

```
<Character>/
  frames/<id>/01.png ...
  frames/fx-<name>/01.png ...
  portrait.png
  select.png
  animations.json
  README.md, provenance.json, production/ ...   (the art team's records)
```

The engine imports with `scripts/import_sheets.py` from the Fame-Over repo. It crops each frame, packs them
into sheet pages (4096x4096 max) and writes `sheet.json` (frame rectangles, pivot, hurtboxes, hitboxes). It
suggests hit and hurt boxes from the pixels; the developer checks them in the in-game sprite viewer. Art
teams don't need to provide boxes.

## 8. Quality checks before delivery

- Same face, hair, outfit, scarf, prop and lighting on every frame; no extra or missing fingers or limbs,
  no props appearing or vanishing unless the brief says so.
- All frames 768x768 with the pivot in place; standing height about 500 px on every grounded frame.
- No coloured fringe on edges, no stray pixels, no leftover background.
- Loops are seamless; `getup`, `intro` and hit reactions return cleanly to idle frame 1.
