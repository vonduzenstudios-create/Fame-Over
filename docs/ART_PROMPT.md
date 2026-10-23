# Fame Over character art prompt (v3)

Paste everything below the line into the image-generation agent, together with `docs/ART_SPEC.md`
(the engine compatibility specification). The agent interviews you first, then produces a character
the game can load directly.

---

You are creating ORIGINAL fighting-game character art and animation for **Fame Over**, a 1920x1080
2D fighting game with detailed, painted, photographic-looking sprites in the spirit of mid-90s
digitized arcade fighters. Follow the staged workflow and its approval gates below. Use your
image-generation, image-processing and filesystem tools to produce real deliverables.

The attached **ART_SPEC.md is binding**: canvas, pivot, facing, scale, colour, edges, lighting,
animation ids, timing format and FX rules all come from it. Where this prompt and the spec disagree,
the spec wins. Don't restate the spec to me; follow it.

## Production boundaries (non-negotiable)

- Everything is independently designed and animated. Never download, trace, edit, reskin, train on, or
  use as a reference any third-party game sprite, gameplay image, silhouette, pose sequence, skeleton,
  depth map or extracted motion, including earlier edits of such material.
- A reference game may be named only as a loose description of feel ("90s digitized arcade fighter").
  It is never an art, pose or timing template.
- Keep production records (`generation-prompts.json`, `provenance.json`). State honestly what inputs
  were used. Never claim legal clearance; that is a separate review.

## Stage 0: Interview

Ask me the questions below **in batches of 4 to 6**, one section at a time, waiting for my answers
before moving on. Offer a recommended answer for each question so I can just say "yes". Skip anything
I've already answered in this conversation or in an attached character brief. If an answer leaves
something the engine needs undefined, ask a short follow-up rather than guessing.

**A. Identity**
1. Character id (lowercase, no spaces; used for folder and file names) and display name.
2. One-line concept and personality. Who are they, and how do they carry themselves in a fight?
3. Is this an original character, or inspired by a real person or existing character? If inspired,
   which traits do we keep, and do we have permission for a recognisable likeness? (Default: an
   original character with only broad, non-identifying traits.)

**B. Look**
4. Build, apparent age and height. Standing height on the canvas is about 500 px; give a range of
   460-560 px for shorter or taller characters.
5. Face, hair and any facial hair; skin tone.
6. Outfit, top to bottom, with the main colours. What must stay identical on every frame?
7. Accessories, and which ones may move (scarf ends, coat tails, hair).

**C. Fighting style**
8. Stance: orthodox or southpaw (which foot and fist lead), guard height, and weight on the front or
   back foot.
9. Movement character: light and bouncy, heavy and planted, swaggering, etc.
10. Punch and kick flavour: boxer, brawler, martial artist, or something character-specific.
11. Throw: how they grab and how they throw (over the shoulder, hip toss, shove away).

**D. Signature prop**
12. Is there a prop? What is it, what size, what material and colour?
13. Where is it stowed when not in use (one fixed place on the body, the same on every frame)?
14. Which attacks use it? Name standard attacks it replaces (for example `hk` becomes a prop swing)
    and/or specials. All other attacks are unarmed.

**E. Specials** (up to 3 for now; we can add more later)
For each special:
15. Name, and a one-line description of what happens.
16. Kind: strike, projectile, rush (travels forward), anti-air, or grab.
17. Body animation beats: wind-up, release, recovery. Roughly how many frames?
18. Any effect that leaves the body (projectile, flame, splash): what it looks like, how big, and
    whether it travels. Effects are separate `fx-<name>` animations per the spec.

**F. Presentation**
19. Intro (before round 1): what they do, ending in their stance.
20. Victory: what they do when they win a round.
21. Dizzy: how they look stunned (sway, clutch head, comic touches).
22. Portrait expression for the select screen and health bar.
23. Any personality touches in idle (breathing, adjusting clothing, glancing).

**G. Production**
24. Method: fresh image generation from written pose briefs (default), an original 3D rig, or my own
    performance footage.
25. Output folder (default `C:\Games\Fame Over\Graphics\Characters\<id>_v01\`).

## Stage 1: Character brief

Write the agreed answers up as `character-brief.md`: look, palette notes, stance and movement, prop
rules, specials, presentation, and the full animation list with planned frame counts (the spec's
table, plus one folder per special named `sp-<special id>`). Ask me to approve it. **Stop until I
approve.**

## Stage 2: Idle pilot

- Make the character design and the `idle` loop only, following the spec exactly (768x768, pivot
  384,736, facing right, lighting, edges).
- Show the looping GIF and a frame strip, and say plainly what's still imperfect.
- **Stop until I approve the idle.** It becomes the identity reference for everything else.

## Stage 3: Full set

- After approval, make every remaining animation in the brief without asking, except about genuinely
  new ambiguities. Plan each animation's beats in writing before generating it.
- Use only the approved idle and the brief as identity references. Keep face, outfit, prop, lighting
  and scale consistent; a changed prop, extra limb, colour drift or coloured edge fringe is a defect.
- Generate in small, clearly specified batches; check the actual layout before extracting frames;
  never resize frames individually.

## Stage 4: Review

Run the spec's quality checks, then show a labelled GIF for every animation and an offline gallery.
Invite changes by animation and frame number. **Stop until I approve.** Apply changes, keep earlier
approved versions, and ask again.

## Stage 5: Delivery

Deliver exactly this, in the output folder and as a ZIP:

```
<id>_v01/
  frames/<animation id>/01.png ...      every animation in the spec's table
  frames/sp-<special id>/01.png ...     one per special
  frames/fx-<name>/01.png ...           effects
  portrait.png
  select.png
  animations.json                       order, ticks, impact, fx, per the spec
  character.json                        the game data below
  character-brief.md
  previews/*.gif, preview-gallery.html
  generation-prompts.json, provenance.json, README.md
```

`character.json` tells the programmer what to wire up:

```json
{
  "id": "chef",
  "name": "Display Name",
  "standingHeight": 500,
  "stance": "orthodox",
  "prop": { "name": "rolling pin", "stowed": "back of the belt, right hip", "usedIn": ["hk", "sp-pin-spin"] },
  "throw": "grabs the collar and throws over the shoulder",
  "specials": [
    {
      "id": "pin-spin",
      "name": "Special name",
      "kind": "rush",
      "description": "One line on what happens.",
      "animation": "sp-pin-spin",
      "impact": 3,
      "fx": [{ "id": "fx-flour", "frame": 2, "x": 160, "y": -380 }],
      "projectile": null
    }
  ],
  "intro": "One line.",
  "victory": "One line."
}
```

For a projectile special, `projectile` is `{ "fx": "fx-<name>", "spawnFrame": <zero-based>, "x": ..., "y": ...,
"travels": true }`. Report the real folder, frame counts per animation and anything unresolved. Don't claim
engine integration; the programmer does that.
