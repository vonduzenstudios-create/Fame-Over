# Starting a new art chat (Fame Over pilot)

## The size standard (one number, no back and forth)

The game draws at 1920x1080. Every frame is a **768x768 transparent PNG**, feet on **(384, 736)**, and the
character stands **500 px tall** in the idle stance (the martial artist 510 px). The engine never enlarges
art, so frames are exported at that size directly.

The earlier chef pilot exports (112x152 frames, a ~140 px figure) were made for the old 480x270 spec. The
large image that looked good is the same art at its full source resolution. Keep that source, and
re-export it: `scale = 500 / (source idle height in px)`, one factor for every frame.

## What to attach

1. `ART_PROMPT.md` (paste its text below the line as the first message, or attach it)
2. `ART_SPEC.md`
3. The brief for the character you're making now: `characters/chef.md` or `characters/martial-artist.md`
   (attaching both is fine; the agent asks which one first and makes only that one)
4. The `poses/` folder (one board per animation: what each animation must do for the engine)
5. For the chef only: the approved chef pilot image, as the identity and rendering-quality reference

## Opening message

> Follow the attached ART_PROMPT.md. ART_SPEC.md (v3) is binding. Make the **chef** first, from
> chef.md; the attached image is the approved visual reference for his look and rendering quality, not
> for pose or size. Start with Stage 0: show me the brief's proposals section by section and ask the
> open questions. Final frames are 768x768, feet at (384, 736), upright idle height 500 px, one scale
> factor for the whole set.

## What comes back to me

At Stage 2 (idle pilot), send me the `idle` folder. I'll import it and check it in the game the same
day, so we catch size or pivot problems before the full set. After that the agent makes the full set,
and the delivered folder goes into the repo's importer unchanged.

## Animating: use image-to-video, not one image per frame (2026-10-24)

Generating each frame as its own image repaints the character every time, so it flickers and jerks.
Video models (Kling, Seedance, Wan, Grok Imagine Video) make all the frames of a move together from the
approved character image, so the character stays consistent. For every animation:

1. Start from the approved master image of the character (the same one every time).
2. Prompt one move per clip: "side view, facing right, [the move from the pose board], stays in place,
   locked camera, full body in frame, flat solid pure green (#00ff00) background, no shadows".
   Idle, walk and dizzy: "seamless loop".
3. Send me the clip, or run it yourself:
   `python3 scripts/import_video.py clip.mp4 --art <character folder> --anim lp --frames 6`
   It picks the frames, removes the green, sets the size and the feet, and keeps one scale for every clip.
