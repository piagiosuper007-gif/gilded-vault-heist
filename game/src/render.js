// The Gilded Vault — drawing only. Every pixel on the canvas comes from here:
// floor, carpet and rug, walls, plinths and prizes, cones, guards, the thief,
// the HUD, the vignette and the six screen panels.
import { W, H, WALL_T, DOOR_X0, DOOR_X1, COLORS, WALLS, FURNITURE, LOOT, GUARDS, THIEF, ALARM, SCORE } from './config.js';
import { lootValue, vaultState } from './world.js';
import { seededPoints } from './random.js';
import { DUST_SEED, DUST_COUNT } from './config.js';

const dust = seededPoints(DUST_SEED, DUST_COUNT, W, H);

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cone(ctx, x, y, angle, half, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - half) * range, y + Math.sin(angle - half) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + half) * range, y + Math.sin(angle + half) * range);
  ctx.stroke();
}

function drawPrize(ctx, l, time) {
  const { x, y } = l;
  const glint = 0.5 + 0.5 * Math.sin(time * 2 + l.x);
  if (l.id === 'scarab') {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath(); ctx.ellipse(x, y, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + s * 8, y - 6 + i * 6);
        ctx.lineTo(x + s * 17, y - 10 + i * 8);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#7a5a10';
    ctx.beginPath(); ctx.arc(x - 4, y - 2, 2, 0, Math.PI * 2); ctx.arc(x + 4, y - 2, 2, 0, Math.PI * 2); ctx.fill();
  } else if (l.id === 'mask') {
    ctx.fillStyle = COLORS.jade;
    rr(ctx, x - 14, y - 10, 28, 20, 8); ctx.fill();
    ctx.fillStyle = '#123326';
    ctx.beginPath(); ctx.ellipse(x - 6, y - 2, 4, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 6, y - 2, 4, 2.5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 10, y + 5); ctx.lineTo(x + 10, y + 5); ctx.stroke();
  } else if (l.id === 'sapphire') {
    ctx.fillStyle = COLORS.sapphire;
    ctx.beginPath();
    ctx.moveTo(x, y - 13); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 13); ctx.lineTo(x - 12, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#cfe4ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13); ctx.stroke();
  } else {
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x - 16, y + 2, 32, 8);
    ctx.fillRect(x - 11, y - 6, 22, 8);
    ctx.fillRect(x - 6, y - 14, 12, 8);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(x - 16, y + 2, 32, 2);
  }
  // Glint turning above a prize still on its plinth.
  ctx.save();
  ctx.translate(x, y - 22);
  ctx.rotate(time * 0.8);
  ctx.strokeStyle = `rgba(255, 240, 180, ${0.35 + 0.45 * glint})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
  ctx.moveTo(0, -6); ctx.lineTo(0, 6);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, g, def) {
  const alerted = g.seeing || g.state === 'chase';
  cone(ctx, g.x, g.y, g.facing, def.halfAngle, def.range,
    alerted ? COLORS.coneAlert : COLORS.coneGuard,
    alerted ? COLORS.coneAlertEdge : COLORS.coneGuardEdge);
  ctx.fillStyle = COLORS.guardUniform;
  ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.guardCap;
  ctx.beginPath(); ctx.arc(g.x, g.y - 3, 8, Math.PI, 0); ctx.fill();
  ctx.fillRect(g.x - 8, g.y - 6, 16, 4);
  // Torch dot ahead of the guard.
  ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
  ctx.beginPath(); ctx.arc(g.x + Math.cos(g.facing) * 17, g.y + Math.sin(g.facing) * 17, 2.5, 0, Math.PI * 2); ctx.fill();
  if (alerted) {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 20);
  }
}

function drawThief(ctx, t, grab, time) {
  // Warm pool of light under the thief so they never vanish into the dark floor.
  const glow = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 42);
  glow.addColorStop(0, 'rgba(255, 210, 120, 0.28)');
  glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(t.x, t.y, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.thiefCloak;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y - 14);
  ctx.quadraticCurveTo(t.x + 13, t.y - 4, t.x + 10, t.y + 11);
  ctx.quadraticCurveTo(t.x, t.y + 15, t.x - 10, t.y + 11);
  ctx.quadraticCurveTo(t.x - 13, t.y - 4, t.x, t.y - 14);
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefTrim;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(t.x, t.y + 2, 9, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = '#f2d8a0';
  ctx.beginPath(); ctx.arc(t.x, t.y - 4, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1a26';
  ctx.beginPath(); ctx.arc(t.x - 1.6, t.y - 4, 1.1, 0, Math.PI * 2); ctx.arc(t.x + 1.6, t.y - 4, 1.1, 0, Math.PI * 2); ctx.fill();
  if (grab.id && grab.progress > 0) {
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 20, -Math.PI / 2, -Math.PI / 2 + grab.progress * Math.PI * 2);
    ctx.stroke();
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function centerText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawHud(ctx, world) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, W, 34);
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`LOOT $${lootValue(world).toLocaleString()}`, 14, 22);
  // One diamond per prize, gold once pocketed.
  world.loot.forEach((l, i) => {
    const cx = 210 + i * 26;
    const cy = 17;
    ctx.fillStyle = l.taken ? COLORS.gold : 'rgba(169, 178, 196, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 7, cy);
    ctx.closePath(); ctx.fill();
  });
  // Alarm meter in the middle.
  const mx = W / 2 - 130;
  ctx.fillStyle = '#10151f';
  rr(ctx, mx, 9, 260, 16, 8); ctx.fill();
  const frac = world.alarm / ALARM.max;
  ctx.fillStyle = frac < 0.5 ? '#3fae5a' : frac < 0.7 ? '#e8a93c' : '#e84040';
  if (frac > 0) { rr(ctx, mx, 9, Math.max(16, 260 * frac), 16, 8); ctx.fill(); }
  ctx.strokeStyle = '#5a6478'; ctx.lineWidth = 1;
  rr(ctx, mx, 9, 260, 16, 8); ctx.stroke();
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('ALARM', W / 2, 21);
  // Attempts as dots, clock, vault chip.
  for (let i = 0; i < SCORE.attempts; i++) {
    ctx.fillStyle = i < world.attempts ? '#e8b93c' : 'rgba(169, 178, 196, 0.3)';
    ctx.beginPath(); ctx.arc(W - 260 + i * 20, 17, 5, 0, Math.PI * 2); ctx.fill();
  }
  const mins = Math.floor(world.elapsed / 60);
  const secs = Math.floor(world.elapsed % 60);
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, W - 170, 22);
  ctx.fillStyle = world.vaultOpen ? '#3fae5a' : '#8a6d1f';
  rr(ctx, W - 158, 8, 144, 18, 9); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.vaultOpen ? 'VAULT OPEN' : 'VAULT LOCKED', W - 86, 21);
  // Spotted banner.
  if (world.alarm >= ALARM.bannerAt && world.screen === 'play') {
    ctx.fillStyle = 'rgba(180, 20, 20, 0.9)';
    rr(ctx, W / 2 - 90, 44, 180, 30, 8); ctx.fill();
    centerText(ctx, 'SPOTTED!', W / 2, 65, 'bold 18px sans-serif', '#fff');
  }
  // Hint line on a dark pill so it reads over the exit door.
  ctx.fillStyle = 'rgba(10, 13, 22, 0.75)';
  const hint = world.screen === 'play'
    ? 'WASD / arrows move · Shift sneak · hold Space to grab · P pause · M mute'
    : 'Space / Enter / click to continue';
  ctx.font = '13px sans-serif';
  const hw = ctx.measureText(hint).width + 24;
  rr(ctx, W / 2 - hw / 2, H - 26, hw, 20, 10); ctx.fill();
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  ctx.fillText(hint, W / 2, H - 12);
}

function drawPanels(ctx, world, best) {
  const s = world.screen;
  if (s === 'play') return;
  if (s === 'title') {
    panel(ctx, 340, 150, 600, 330);
    centerText(ctx, 'THE GILDED VAULT', 640, 210, 'bold 44px serif', COLORS.gold);
    centerText(ctx, 'A midnight museum heist', 640, 248, 'italic 20px serif', COLORS.text);
    centerText(ctx, 'Pocket the three relics, crack the vault,', 640, 300, '16px sans-serif', COLORS.muted);
    centerText(ctx, 'grab the Cache and slip out the door.', 640, 324, '16px sans-serif', COLORS.muted);
    centerText(ctx, 'WASD move · Shift sneak · hold Space to grab', 640, 364, '15px sans-serif', COLORS.text);
    if (best > 0) centerText(ctx, `Best score: $${best.toLocaleString()}`, 640, 398, '15px sans-serif', COLORS.gold);
    centerText(ctx, 'Press Space or click to start', 640, 440, 'bold 18px sans-serif', COLORS.text);
  } else if (s === 'paused') {
    panel(ctx, 440, 250, 400, 160);
    centerText(ctx, 'PAUSED', 640, 310, 'bold 36px serif', COLORS.text);
    centerText(ctx, 'Press P or Space to carry on', 640, 352, '15px sans-serif', COLORS.muted);
  } else if (s === 'caught') {
    panel(ctx, 390, 240, 500, 190);
    centerText(ctx, 'CAUGHT!', 640, 300, 'bold 40px serif', '#e84040');
    centerText(ctx, `One attempt burned — ${world.attempts} left. Your loot stays pocketed.`, 640, 342, '16px sans-serif', COLORS.text);
    centerText(ctx, 'Press Space to slip back in', 640, 384, '15px sans-serif', COLORS.muted);
  } else if (s === 'gameover') {
    panel(ctx, 390, 240, 500, 190);
    centerText(ctx, 'THE CREW GOT PINCHED', 640, 300, 'bold 32px serif', '#e84040');
    centerText(ctx, `All three attempts burned. Haul kept: $${lootValue(world).toLocaleString()}.`, 640, 342, '16px sans-serif', COLORS.text);
    centerText(ctx, 'Press Space to try again', 640, 384, '15px sans-serif', COLORS.muted);
  } else if (s === 'win') {
    const sc = world.score;
    panel(ctx, 380, 150, 520, 360);
    centerText(ctx, 'CLEAN GETAWAY', 640, 205, 'bold 38px serif', COLORS.gold);
    centerText(ctx, 'The vault is empty and the night is yours.', 640, 240, '16px sans-serif', COLORS.muted);
    ctx.textAlign = 'left';
    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('Haul', 450, 290);
    ctx.fillText('Time bonus', 450, 322);
    ctx.fillText('Ghost bonus', 450, 354);
    ctx.textAlign = 'right';
    ctx.fillText(`$${sc.haul.toLocaleString()}`, 830, 290);
    ctx.fillText(`$${sc.timeBonus.toLocaleString()}`, 830, 322);
    ctx.fillText(`$${sc.ghostBonus.toLocaleString()}`, 830, 354);
    ctx.strokeStyle = '#5a6478';
    ctx.beginPath(); ctx.moveTo(450, 372); ctx.lineTo(830, 372); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('TOTAL', 450, 406);
    ctx.textAlign = 'right';
    ctx.fillText(`$${sc.total.toLocaleString()}`, 830, 406);
    centerText(ctx, `Finished in ${Math.round(sc.time)}s · highest alarm ${sc.maxAlarm}`, 640, 448, '14px sans-serif', COLORS.muted);
    if (best > 0) centerText(ctx, `Best score: $${best.toLocaleString()}`, 640, 476, '14px sans-serif', COLORS.gold);
  }
}

export function render(ctx, world, best) {
  const time = world.time;
  // Floor: checker of two dark blue-grey tiles with grout lines.
  for (let ty = 0; ty < H / 64; ty++) {
    for (let tx = 0; tx < W / 64; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(tx * 64, ty * 64, 64, 64);
    }
  }
  ctx.strokeStyle = COLORS.grout;
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Red carpet runner from the door up the middle to the heart of the hall.
  ctx.fillStyle = COLORS.carpet;
  ctx.fillRect(DOOR_X0 - 4, 400, DOOR_X1 - DOOR_X0 + 8, H - WALL_T - 400);
  ctx.fillStyle = COLORS.carpetEdge;
  ctx.fillRect(DOOR_X0 - 4, 400, 3, H - WALL_T - 400);
  ctx.fillRect(DOOR_X1 + 1, 400, 3, H - WALL_T - 400);
  // Round rug under the Jade Mask's plinth.
  ctx.fillStyle = COLORS.rug;
  ctx.beginPath(); ctx.arc(640, 410, 92, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COLORS.carpetEdge;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(640, 410, 92, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(640, 410, 70, 0, Math.PI * 2); ctx.stroke();
  // Dust motes drifting from fixed seeded positions.
  ctx.fillStyle = 'rgba(220, 225, 240, 0.35)';
  for (const d of dust) {
    const dx = d.x + Math.sin(time * 0.25 + d.p) * 6;
    const dy = d.y + Math.cos(time * 0.18 + d.p) * 5;
    ctx.beginPath(); ctx.arc(dx, dy, d.r, 0, Math.PI * 2); ctx.fill();
  }
  // Plinths with glass cases, prizes on top.
  for (const p of FURNITURE) {
    const isPlinth = LOOT.some((l) => Math.abs(l.x - (p.x + p.w / 2)) < 1 && Math.abs(l.y - (p.y + p.h / 2)) < 1);
    if (!isPlinth) {
      ctx.fillStyle = '#4a3428';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#6b4e38';
      ctx.fillRect(p.x, p.y, p.w, 5);
      continue;
    }
    ctx.fillStyle = COLORS.plinth;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = COLORS.plinthTop;
    ctx.fillRect(p.x, p.y, p.w, 6);
    ctx.fillStyle = COLORS.glass;
    ctx.fillRect(p.x + 3, p.y - 26, p.w - 6, 30);
    ctx.strokeStyle = 'rgba(200, 220, 240, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + 3, p.y - 26, p.w - 6, 30);
  }
  for (const l of world.loot) {
    if (!l.taken) drawPrize(ctx, l, time);
  }
  // Locked label over the vault until it opens.
  if (!world.vaultOpen) {
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('LOCKED', 1130, 158);
  }
  // Camera cones first (under the guards), then guards, then the thief.
  for (const c of world.cameras) {
    const alerted = c.seeing;
    cone(ctx, c.x, c.y, c.angle, c.halfAngle, c.range,
      alerted ? COLORS.coneAlert : COLORS.coneCamera,
      alerted ? COLORS.coneAlertEdge : COLORS.coneCameraEdge);
    ctx.fillStyle = '#20242e';
    ctx.fillRect(c.x - 10, c.y - 6, 20, 12);
    ctx.fillStyle = alerted ? '#ff4040' : '#e84040';
    ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2); ctx.fill();
    if (alerted) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', c.x, c.y - 14);
    }
  }
  for (let i = 0; i < world.guards.length; i++) drawGuard(ctx, world.guards[i], GUARDS[i]);
  drawThief(ctx, world.thief, world.grab, time);
  // Walls with a gold trim at the vault chamber.
  for (const r of WALLS) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = COLORS.wallTop;
    if (r.h <= WALL_T) ctx.fillRect(r.x, r.y, r.w, 4);
    else if (r.w <= WALL_T) ctx.fillRect(r.x, r.y, 4, r.h);
    else ctx.fillRect(r.x, r.y, r.w, 4);
  }
  // Gold trim where the vault chamber meets the hall.
  ctx.fillStyle = COLORS.wallGold;
  ctx.fillRect(972, 200, 16, 60);
  ctx.fillRect(980, 372, 16, 16);
  // Exit door: brass frame and lit mat.
  ctx.fillStyle = COLORS.wallGold;
  ctx.fillRect(DOOR_X0 - 4, H - WALL_T, 4, WALL_T);
  ctx.fillRect(DOOR_X1, H - WALL_T, 4, WALL_T);
  ctx.fillStyle = '#e8d27a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', (DOOR_X0 + DOOR_X1) / 2, H - 8);
  ctx.fillStyle = 'rgba(232, 178, 60, 0.25)';
  ctx.fillRect(DOOR_X0, H - WALL_T - 26, DOOR_X1 - DOOR_X0, 26);
  // Red vignette deepening as the alarm climbs.
  const vig = world.alarm / ALARM.max;
  if (vig > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(200, 0, 0, 0)');
    g.addColorStop(1, `rgba(200, 0, 0, ${0.45 * vig})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  drawHud(ctx, world);
  // The top bar covers the top camera's housing: draw the housings again
  // on top so both cameras stay visible.
  for (const c of world.cameras) {
    ctx.fillStyle = '#20242e';
    ctx.fillRect(c.x - 10, c.y - 6, 20, 12);
    ctx.fillStyle = c.seeing ? '#ff4040' : '#e84040';
    ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  drawPanels(ctx, world, best);
}
