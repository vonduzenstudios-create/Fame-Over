// Placeholder stage: a restaurant kitchen at night. Far wall scrolls slower than the floor.
// Drawn in a quarter-size space (480x270) and scaled up 4x until real stage art exists.

const W = 480, H = 270, FLOOR = 252, STAGE_W = 960;

export function drawKitchen(ctx: CanvasRenderingContext2D, worldCamX: number, t: number) {
  ctx.save();
  ctx.scale(4, 4);
  drawSmall(ctx, worldCamX / 4, t);
  ctx.restore();
}

function drawSmall(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
  g.addColorStop(0, '#1a1420');
  g.addColorStop(1, '#3a2a30');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, FLOOR);
  // far wall tiles and hanging pans (half speed)
  const far = camX * 0.5;
  ctx.fillStyle = '#4a3a3e';
  for (let x = -((far % 24) + 24); x < W + 24; x += 24) for (let y = 70; y < FLOOR - 40; y += 16) ctx.fillRect(x + ((y / 16) % 2) * 12, y, 22, 14);
  for (let i = 0; i < 14; i++) {
    const x = i * 70 + 20 - far;
    if (x < -40 || x > W + 40) continue;
    ctx.fillStyle = '#888';
    ctx.fillRect(x, 30, 1, 24);
    ctx.fillStyle = '#2a2a2e';
    ctx.beginPath(); ctx.arc(x, 62, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 1, 50, 3, 6);
  }
  // counter along the back (full speed)
  for (let x = -camX; x < STAGE_W - camX; x += 120) {
    ctx.fillStyle = '#9aa0a8';
    ctx.fillRect(x, FLOOR - 52, 112, 6);
    ctx.fillStyle = '#5a6068';
    ctx.fillRect(x + 2, FLOOR - 46, 108, 46);
    const flame = 2 + Math.round(Math.sin(t * 0.3 + x) * 1.5);
    ctx.fillStyle = '#ff8a20';
    ctx.fillRect(x + 20, FLOOR - 56 - flame, 14, flame + 2);
    ctx.fillRect(x + 70, FLOOR - 56 - flame, 14, flame + 2);
  }
  // floor
  ctx.fillStyle = '#2c2228';
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#3a2e34';
  for (let x = -(camX % 32) - 32; x < W; x += 32) ctx.fillRect(x, FLOOR, 16, H - FLOOR);
}
