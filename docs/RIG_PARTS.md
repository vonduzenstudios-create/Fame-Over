# Layered character parts for the cut-out rig (draft)

Instead of painting every frame, the character is painted **once**, as separate layers. The developer
rigs the layers and animates every move from them, so the character is identical on every frame and the
frame count is free. Same rules as ART_SPEC.md for canvas, pivot, size, lighting and edges.

## The master pose
- One 768x768 canvas, pivot (384, 736), upright height 500 px, facing right, **side-on three-quarter
  stance with arms slightly away from the body** so no part hides another more than necessary.
- Every part is its own transparent 768x768 PNG, **left exactly where it sits in the master pose**.
  Stacking all layers in the listed order must reproduce the master pose.

## Painting the parts
- Paint each part **complete, including the bits hidden by other parts**: a forearm continues under the
  fist, an upper arm continues into the shoulder, a thigh continues up under the jacket.
- At every joint, extend the part past the joint with a rounded end (elbow, knee, shoulder, hip, neck,
  wrist, ankle) so it can rotate without a gap showing.
- No shadows from one part painted onto another (the developer adds those). Clothing folds are fine.

## Layers (back to front) - `parts/<name>.png`
| name | part |
| --- | --- |
| rear-upperarm, rear-forearm, rear-fist | arm furthest from the camera |
| rear-thigh, rear-shin, rear-shoe | leg furthest from the camera |
| prop | rolling pin, stowed |
| torso | jacket from collar to hem, no arms, no head |
| pelvis | belt and top of trousers |
| neck, head | head including hair and ears; scarf goes with the torso |
| lead-thigh, lead-shin, lead-shoe | leg nearest the opponent |
| lead-upperarm, lead-forearm, lead-fist | arm nearest the opponent |

## Extra drawings (same scale and lighting, each on its own 768x768 canvas)
- Hands: open hand (grab), flat hand (chop), both sides.
- Head: shouting, hurt (eyes shut, wince), knocked out.
- Torso: seen from behind (spins, roundhouse, turn), doubled over (hit in the stomach).
- Prop in the hand, for the attacks that use it.

## parts.json
For each part, the joint point it rotates around, in canvas pixels:
```json
{ "lead-forearm": { "joint": [431, 372] }, "lead-fist": { "joint": [446, 336] } }
```
