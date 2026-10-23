import { noise, tone } from './audio';

// Fight sounds, made in code.

export const sfx = {
  hit(heavy: boolean) {
    noise({ dur: heavy ? 0.22 : 0.12, vol: heavy ? 0.5 : 0.35, freq: heavy ? 1400 : 2400, to: 300 });
    tone({ type: 'square', freq: heavy ? 140 : 220, to: 60, dur: heavy ? 0.18 : 0.1, vol: 0.18 });
  },
  block() {
    tone({ type: 'triangle', freq: 900, to: 500, dur: 0.07, vol: 0.2 });
    noise({ dur: 0.05, vol: 0.2, type: 'highpass', freq: 3000 });
  },
  whoosh() {
    noise({ dur: 0.1, vol: 0.12, type: 'bandpass', freq: 800, to: 2400, q: 1.5 });
  },
  gong() {
    tone({ type: 'sine', freq: 110, dur: 1.2, vol: 0.3 });
    tone({ type: 'sine', freq: 164, dur: 0.9, vol: 0.15 });
  },
  select() {
    tone({ type: 'square', freq: 660, to: 880, dur: 0.08, vol: 0.12 });
  },
};
