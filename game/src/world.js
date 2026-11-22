// The Gilded Vault — rules and state only. No drawing, no browser here:
// the thief, guards, cameras, line of sight, the alarm, grabbing, the vault
// lock, attempts, the win and the score. Pure functions over plain state.
import {
  W, H, WALL_T, DOOR_X0, DOOR_X1, SIGHT_BLOCKERS, MOVE_BLOCKERS,
  LOOT, VAULT_NEEDS, GUARDS, CAMERAS, THIEF, ALARM, SCORE,
} from './config.js';

export const TAU = Math.PI * 2;

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function segHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const corners = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  const d = (ax, ay, bx, by, cx, cy) => (cx - ax) * (by - ay) - (cy - ay) * (bx - ax);
  for (const [ax, ay, bx, by] of corners) {
    const d1 = d(ax, ay, bx, by, x1, y1);
    const d2 = d(ax, ay, bx, by, x2, y2);
    const d3 = d(x1, y1, x2, y2, ax, ay);
    const d4 = d(x1, y1, x2, y2, bx, by);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  }
  return false;
}

export function hasLineOfSight(x1, y1, x2, y2) {
  for (const r of SIGHT_BLOCKERS) {
    if (segHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

function circleHitsRect(cx, cy, rad, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < rad * rad;
}

// Move a circle against the blockers one axis at a time, so it slides
// along a wall instead of sticking in a corner. The thief collides with
// everything; guards collide with walls only — their patrol loops as
// specified cross the low plinths and benches (Marco's top leg runs
// straight through the Sapphire's plinth), so furniture never stops them.
export function moveCircle(x, y, rad, dx, dy, blockers = MOVE_BLOCKERS) {
  let nx = x + dx;
  for (const r of blockers) {
    if (circleHitsRect(nx, y, rad, r)) { nx = x; break; }
  }
  let ny = y + dy;
  for (const r of blockers) {
    if (circleHitsRect(nx, ny, rad, r)) { ny = y; break; }
  }
  nx = Math.max(WALL_T + rad, Math.min(W - WALL_T - rad, nx));
  ny = Math.max(WALL_T + rad, Math.min(H - WALL_T - rad, ny));
  return { x: nx, y: ny };
}

export function createWorld(seed) {
  return {
    seed,
    time: 0,
    elapsed: 0,
    screen: 'title',
    thief: { x: THIEF.startX, y: THIEF.startY, facing: -Math.PI / 2, moving: false, sneaking: false },
    guards: GUARDS.map((g) => ({
      name: g.name, x: g.loop[0][0], y: g.loop[0][1],
      wp: 1, pauseT: 0, facing: 0, state: 'patrol',
      chaseT: 0, lastSeenX: 0, lastSeenY: 0, seeing: false,
    })),
    cameras: CAMERAS.map((c) => ({ ...c, angle: c.base, seeing: false })),
    loot: LOOT.map((l) => ({ ...l, taken: false })),
    grab: { id: null, progress: 0 },
    alarm: 0,
    maxAlarm: 0,
    attempts: SCORE.attempts,
    vaultOpen: false,
    score: null,
    events: [],
  };
}

export function lootValue(world) {
  return world.loot.filter((l) => l.taken).reduce((s, l) => s + l.value, 0);
}

export function vaultState(world) {
  return world.vaultOpen ? 'OPEN' : `LOCKED ${world.loot.filter((l) => l.taken && l.id !== 'cache').length}/${VAULT_NEEDS}`;
}

function guardSees(world, gi) {
  const g = world.guards[gi];
  const def = GUARDS[gi];
  const dx = world.thief.x - g.x;
  const dy = world.thief.y - g.y;
  const d = Math.hypot(dx, dy);
  if (d > def.range) return 0;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), g.facing)) > def.halfAngle) return 0;
  if (!hasLineOfSight(g.x, g.y, world.thief.x, world.thief.y)) return 0;
  return d;
}

function cameraSees(world, ci) {
  const c = world.cameras[ci];
  const dx = world.thief.x - c.x;
  const dy = world.thief.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d > c.range) return 0;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), c.angle)) > c.halfAngle) return 0;
  if (!hasLineOfSight(c.x, c.y, world.thief.x, world.thief.y)) return 0;
  return d;
}

function stepGuard(world, gi, dt) {
  const g = world.guards[gi];
  const def = GUARDS[gi];
  if (g.state === 'chase') {
    g.chaseT -= dt;
    const dx = g.lastSeenX - g.x;
    const dy = g.lastSeenY - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 6 || g.chaseT <= 0) {
      g.state = 'patrol';
      g.pauseT = 0;
      return;
    }
    const sp = THIEF.chaseSpeed * dt;
    const step = Math.min(sp, d);
    g.facing = Math.atan2(dy, dx);
    const moved = moveCircle(g.x, g.y, 13, (dx / d) * step, (dy / d) * step, SIGHT_BLOCKERS);
    g.x = moved.x;
    g.y = moved.y;
    return;
  }
  if (g.pauseT > 0) {
    g.pauseT -= dt;
    return;
  }
  const [tx, ty] = def.loop[g.wp];
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  const sp = def.speed * dt;
  if (d <= Math.max(sp, 2)) {
    g.x = tx;
    g.y = ty;
    g.wp = (g.wp + 1) % def.loop.length;
    g.pauseT = def.pause;
    return;
  }
  g.facing = Math.atan2(dy, dx);
  const moved = moveCircle(g.x, g.y, 13, (dx / d) * sp, (dy / d) * sp, SIGHT_BLOCKERS);
  g.x = moved.x;
  g.y = moved.y;
}

// input: {x, y, sneak, grab} with x/y in -1..1. Returns nothing; mutates.
export function updateWorld(world, input, dt) {
  world.time += dt;
  if (world.screen === 'play') world.elapsed += dt;

  // Cameras sweep on a sine, whatever the screen.
  for (const c of world.cameras) {
    c.angle = c.base + c.sweep * Math.sin((TAU * world.time) / c.period);
  }

  const t = world.thief;
  const moving = input.x !== 0 || input.y !== 0;
  t.moving = moving;
  t.sneaking = !!input.sneak;
  if (moving) {
    const len = Math.hypot(input.x, input.y) || 1;
    const sp = (input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed) * dt;
    t.facing = Math.atan2(input.y, input.x);
    const moved = moveCircle(t.x, t.y, THIEF.radius, (input.x / len) * sp, (input.y / len) * sp);
    t.x = moved.x;
    t.y = moved.y;
  }

  // Guards patrol, chase what they have seen.
  for (let i = 0; i < world.guards.length; i++) stepGuard(world, i, dt);

  // Detection: the strongest seer sets the alarm rate.
  let rate = 0;
  let anyGuard = false;
  for (let i = 0; i < world.guards.length; i++) {
    const d = guardSees(world, i);
    const g = world.guards[i];
    g.seeing = d > 0;
    if (d > 0) {
      anyGuard = true;
      const def = GUARDS[i];
      const near = 1 - ALARM.proximity * (d / def.range);
      rate = Math.max(rate, ALARM.guardSeen * near);
      g.state = 'chase';
      g.chaseT = 3;
      g.lastSeenX = t.x;
      g.lastSeenY = t.y;
    }
  }
  for (let i = 0; i < world.cameras.length; i++) {
    const d = cameraSees(world, i);
    const c = world.cameras[i];
    c.seeing = d > 0;
    if (d > 0) {
      const near = 1 - ALARM.proximity * (d / c.range);
      rate = Math.max(rate, ALARM.cameraSeen * near);
    }
  }
  if (rate > 0 && t.sneaking) rate *= ALARM.sneakFactor;
  if (rate === 0 && moving && !t.sneaking) {
    for (const g of world.guards) {
      if (Math.hypot(t.x - g.x, t.y - g.y) < ALARM.hearRange) { rate = ALARM.heardRunning; break; }
    }
  }
  if (rate > 0) world.alarm = Math.min(ALARM.max, world.alarm + rate * dt);
  else world.alarm = Math.max(0, world.alarm - ALARM.decay * dt);
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);
  if (world.alarm >= ALARM.bannerAt && !world.events.includes('spotted')) {
    world.events.push('spotted');
  }

  // Hold-to-grab: stand still beside a prize and hold; moving drains it.
  let nearLoot = null;
  for (const l of world.loot) {
    if (!l.taken && Math.hypot(t.x - l.x, t.y - l.y) <= THIEF.grabRadius) { nearLoot = l; break; }
  }
  const grabbable = nearLoot && (nearLoot.id !== 'cache' || world.vaultOpen);
  if (grabbable && input.grab && !moving) {
    world.grab.id = nearLoot.id;
    world.grab.progress += dt / THIEF.grabTime;
    if (world.grab.progress >= 1) {
      nearLoot.taken = true;
      world.grab.id = null;
      world.grab.progress = 0;
      world.events.push('grab:' + nearLoot.id);
      if (world.loot.filter((l) => l.taken && l.id !== 'cache').length >= VAULT_NEEDS && !world.vaultOpen) {
        world.vaultOpen = true;
        world.events.push('vault');
      }
    }
  } else {
    world.grab.progress = Math.max(0, world.grab.progress - dt / THIEF.grabTime);
    if (world.grab.progress === 0) world.grab.id = null;
    else if (nearLoot) world.grab.id = nearLoot.id;
  }

  // Caught: the alarm tops out.
  if (world.alarm >= ALARM.max && world.screen === 'play') {
    world.attempts -= 1;
    world.events.push('caught');
    t.x = THIEF.startX;
    t.y = THIEF.startY;
    world.alarm = ALARM.caughtReset;
    world.grab.id = null;
    world.grab.progress = 0;
    for (const g of world.guards) { g.state = 'patrol'; g.chaseT = 0; g.seeing = false; }
    world.screen = world.attempts <= 0 ? 'gameover' : 'caught';
    if (world.screen === 'gameover') world.events.push('gameover');
    return;
  }

  // Win: the Cache pocketed and the thief back at the exit door. The thief's
  // centre can reach y 683 (the wall stops it), so the line is drawn at 678.
  const cache = world.loot.find((l) => l.id === 'cache');
  if (cache.taken && world.screen === 'play'
    && t.y >= H - WALL_T - 18 && t.x > DOOR_X0 + 8 && t.x < DOOR_X1 - 8) {
    const haul = lootValue(world);
    const timeBonus = Math.round(Math.max(0, SCORE.timeLimit - world.elapsed) * SCORE.timePerSecond);
    const ghostBonus = world.maxAlarm <= ALARM.ghostBelow ? SCORE.ghostBonus : 0;
    world.score = { haul, timeBonus, ghostBonus, total: haul + timeBonus + ghostBonus, time: world.elapsed, maxAlarm: Math.round(world.maxAlarm) };
    world.screen = 'win';
    world.events.push('win');
  }
}

export function resetRun(world) {
  const fresh = createWorld(world.seed);
  fresh.screen = 'play';
  Object.assign(world, fresh);
}
