# Cleanup pass for an animation (paste to the art agent)

Run this on one finished animation at a time. Example: "Run the cleanup pass on idle v04."

---

Run a cleanup pass on the animation in `frames/<animation>/`. Small face differences between frames are
acceptable. Your job is to remove the obvious faults that make the motion jerky. Keep the art, the
character and the scale exactly as they are. **Never resize individual frames.**

**Don't change the design** (face, hair, build, outfit, colours) unless I ask for it in the same message.

**Keep the motion alive.** Pinning the feet must not freeze the body: the head, shoulders and chest
still rise and fall as before. A cleaned animation should move as much as the original, just more evenly.

**Never cut and paste parts between frames** (an arm from one frame onto another, a patched pin). It
leaves ghost edges and makes limbs jump. Fix a bad frame by regenerating the whole frame from its
neighbours. Work on copies and save
the result as the next version (for example v05), so I can compare it with the original.

## 1. Measure every frame first
For each frame, record these numbers (alpha >= 128):
- top of the head (y), lowest sole (y), and the left and right edge of each shoe (x);
- the centre of the lead fist and of the rear fist;
- the end of the rolling pin and the knot of the neckerchief.

Put them in a table, including the change from the previous frame. Treat the last frame as coming
before frame 1, because the animation loops.

## 2. Fix the feet (translation only)
In idle, walk-in-place, block, crouch and dizzy, planted feet must not move. If a planted shoe shifts by
more than 2 px, move the **whole frame** (not just the foot) so the shoes line up with frame 1's.
Re-measure afterwards.

## 3. Smooth the motion
Look at how the head and each fist move from frame to frame, including last to first:
- No single step should be more than twice the size of its neighbours. A sudden 5-7 px drop or pop
  between two frames is a fault.
- In a loop, the movement should rise and fall smoothly, like a wave, and the last frame should flow
  into frame 1 with a step about the same size as the others.

To fix a fault, in this order:
1. **Reorder** frames if that gives a smoother sequence.
2. **Replace** a bad frame with a new in-between, generated from its two neighbours (pose halfway
   between them, same face, outfit and scale).
3. **Drop** a frame that doesn't fit, or **repeat** a frame (in `animations.json`) to hold a pose.

## 4. Fix obvious mistakes
Compare each frame with its neighbours and repair:
- extra, missing or merged fingers; hands that change between a fist and an open hand; limbs that
  bend the wrong way;
- the rolling pin changing size, angle or position, or appearing or disappearing; the neckerchief
  changing shape or colour; buttons or sleeves appearing or vanishing;
- hair that jumps to a different shape for one frame;
- stray specks, leftover background, or a coloured edge around the figure;
- see-through areas: alpha must be 255 everywhere inside the body.

Repair only the faulty area, matching the neighbouring frames, or regenerate that single frame from
its neighbours (as in step 3).

## 5. Report
Show the measurement table before and after, list every frame you changed and why, and send a
before/after GIF side by side at the same speed. Update `animations.json` if the frame order or count
changed.
