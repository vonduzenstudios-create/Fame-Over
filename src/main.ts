import { H, W } from './core/consts';
import { endInputFrame, onKey } from './core/input';
import { initAudio } from './audio/audio';
import { FIGHTERS } from './fighters/registry';
import { App, Scene, TitleScene, viewerFor, FightScene } from './scenes/scenes';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

/** Scale the 480x270 picture up by the biggest whole number that fits (x4 on a 1080p screen). */
function resize() {
  const k = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
  canvas.style.width = `${W * k}px`;
  canvas.style.height = `${H * k}px`;
}
window.addEventListener('resize', resize);
resize();

let scene: Scene = { update() {}, draw() {} };
const app: App = {
  boxes: false,
  go(s: Scene) {
    scene = s;
  },
};
if (new URLSearchParams(location.search).has('viewer')) viewerFor(FIGHTERS[0]).then((s) => app.go(s));
else app.go(new TitleScene(app));

window.addEventListener('pointerdown', () => initAudio());
onKey((code) => {
  initAudio();
  if (code === 'F2') app.boxes = !app.boxes;
});

// Fixed 60 Hz simulation with an accumulator so speed is the same on any display.
const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function frame(now: number) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= STEP) {
    scene.update();
    endInputFrame();
    acc -= STEP;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  scene.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Hooks for automated testing.
(window as any).__fo = { app, FIGHTERS, FightScene, get scene() { return scene; } };
