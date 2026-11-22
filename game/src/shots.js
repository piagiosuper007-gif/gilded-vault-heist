// The Gilded Vault — screenshot staging. Each scene plays the real rules
// forward from a fresh world, steered by a scripted thief: legs to walk to
// (sneaking or not), holds to grab, and waits that watch the guards and
// only move when the way is clear. Deterministic: same seed every time.
import { THIEF } from './config.js';

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function guardAt(world, name) {
  return world.guards.find((g) => g.name === name);
}

const SCENES = {
  // Title: the world runs harmlessly for five seconds, thief at the door.
  start: [
    { kind: 'hold', secs: 5 },
  ],
  // Cover: sneak to the Mask, pocket it, cross to the Sapphire, pocket it,
  // then step to the open floor and hold the frame, alarm at zero.
  play: [
    { kind: 'wait', until: (w) => dist(guardAt(w, 'Marco').x, guardAt(w, 'Marco').y, 640, 540) > 260, max: 25, sneak: true },
    { kind: 'go', x: 640, y: 460, sneak: true, first: 'y' },
    { kind: 'grab', id: 'mask' },
    // Wait until Marco is down on the lower half of his loop: from up top
    // he closes on the Sapphire faster than the thief can cross to it.
    { kind: 'wait', until: (w) => guardAt(w, 'Marco').y >= 400, max: 25, sneak: true },
    { kind: 'go', x: 880, y: 215, sneak: true, first: 'x' },
    { kind: 'grab', id: 'sapphire' },
    // Do not wait beside the Sapphire: Marco's east lane runs right past
    // it. Fall back to the open floor, wait there, then step out to it.
    { kind: 'go', x: 700, y: 215, sneak: true, first: 'x' },
    { kind: 'go', x: 700, y: 460, sneak: true, first: 'y' },
    { kind: 'wait', until: (w) => dist(guardAt(w, 'Marco').x, guardAt(w, 'Marco').y, 700, 300) > 260, max: 25, sneak: true },
    { kind: 'go', x: 700, y: 300, sneak: true, first: 'y' },
    { kind: 'hold', secs: 0.6 },
  ],
  // Alarm: slip into Rosa's patrol lane and stand there, not sneaking,
  // until the alarm reaches 70 — spotted banner up, her red cone on us.
  // Wait for her at the door first: standing at (240, 660) puts the thief
  // due south of her east lane, inside her cone when she walks down it.
  alarm: [
    { kind: 'wait', until: (w) => guardAt(w, 'Rosa').y <= 130, max: 25, sneak: true },
    { kind: 'go', x: 240, y: 660, sneak: true, first: 'x' },
    { kind: 'go', x: 240, y: 560, sneak: true, first: 'x' },
    { kind: 'go', x: 240, y: 400, sneak: true, first: 'y' },
    { kind: 'wait', until: (w) => w.alarm >= 70, max: 25, sneak: false },
  ],
  // Escape: the full run, ending on the getaway panel.
  escape: [
    { kind: 'wait', until: (w) => guardAt(w, 'Rosa').y <= 130, max: 25, sneak: true },
    { kind: 'go', x: 240, y: 660, sneak: true, first: 'x' },
    { kind: 'go', x: 240, y: 560, sneak: true, first: 'x' },
    { kind: 'go', x: 170, y: 215, sneak: true, first: 'x' },
    { kind: 'grab', id: 'scarab' },
    { kind: 'go', x: 170, y: 560, sneak: true, first: 'x' },
    { kind: 'go', x: 640, y: 660, sneak: true, first: 'y' },
    { kind: 'wait', until: (w) => dist(guardAt(w, 'Marco').x, guardAt(w, 'Marco').y, 640, 540) > 260, max: 25, sneak: true },
    { kind: 'go', x: 640, y: 460, sneak: true, first: 'y' },
    { kind: 'grab', id: 'mask' },
    { kind: 'wait', until: (w) => guardAt(w, 'Marco').y >= 400, max: 25, sneak: true },
    { kind: 'go', x: 880, y: 215, sneak: true, first: 'x' },
    { kind: 'grab', id: 'sapphire' },
    // Fall back to the middle of the hall and wait until Marco is well
    // south: he can see the vault doorway through its gap from his top
    // leg, so the vault is entered only once he is far from it. Route via
    // x 700: straight south at x 640 runs into the Mask's plinth.
    { kind: 'go', x: 700, y: 460, sneak: true, first: 'x' },
    { kind: 'wait', until: (w) => dist(guardAt(w, 'Marco').x, guardAt(w, 'Marco').y, 980, 230) > 300, max: 25, sneak: true },
    { kind: 'go', x: 880, y: 215, sneak: true, first: 'x' },
    { kind: 'go', x: 950, y: 230, sneak: true, first: 'x' },
    // Through the vault doorway at x 1010, not 1000: the thief's circle
    // is 13 wide, so at x 1000 it still clips the doorway wall's corner.
    { kind: 'go', x: 1010, y: 300, sneak: true, first: 'x' },
    { kind: 'wait', until: (w) => guardAt(w, 'Vince').x > 1180, max: 25, sneak: true },
    // Dash through the vault at full speed: the chamber camera sweeps the
    // Cache, so the grab and the exit are walked, not sneaked.
    { kind: 'go', x: 1130, y: 245, sneak: false, first: 'x' },
    { kind: 'grab', id: 'cache' },
    { kind: 'go', x: 1150, y: 340, sneak: false, first: 'x' },
    { kind: 'go', x: 1150, y: 500, sneak: false, first: 'y' },
    { kind: 'go', x: 1000, y: 500, sneak: true, first: 'x' },
    // Wait at the open floor until Vince is on the west side of his loop:
    // walking west along the bottom corridor ahead of his westbound leg
    // puts the thief straight in his cone and he chases it down.
    { kind: 'wait', until: (w) => guardAt(w, 'Vince').x <= 1030, max: 25, sneak: true },
    { kind: 'go', x: 1000, y: 660, sneak: true, first: 'y' },
    { kind: 'go', x: 640, y: 660, sneak: true, first: 'x' },
    // Walk right out through the door: the win line is at y 678 and the
    // leg ends within 8 of its target, so aim past it to be sure to cross.
    { kind: 'go', x: 640, y: 690, sneak: false, first: 'y' },
  ],
};

export function createShotDriver(world, name) {
  const steps = SCENES[name];
  if (!steps) throw new Error('unknown shot scene: ' + name);
  let i = 0;
  let waitT = 0;
  let holdT = 0;
  let grabT = 0;
  // L-shaped legs: move along `first` axis, then the other, so the thief
  // never cuts a diagonal into a bench or pillar corner and wedges there.
  let legPhase = 0;
  let stuckT = 0;
  let lastX = 0;
  let lastY = 0;

  function axis(d) {
    if (d > 6) return 1;
    if (d < -6) return -1;
    return d / 6;
  }

  return {
    name,
    stepIndex() { return i; },
    update(dt) {
      if (i >= steps.length) return { x: 0, y: 0, sneak: false, grab: false, done: true };
      const s = steps[i];
      const t = world.thief;
      if (s.kind === 'go') {
        const dx = s.x - t.x;
        const dy = s.y - t.y;
        if (Math.hypot(dx, dy) < 8) { i++; waitT = 0; holdT = 0; legPhase = 0; stuckT = 0; return this.update(dt); }
        // Fail-safe: a leg that makes no progress for 3s is skipped, so a
        // wedge can never stall the scene forever.
        if (Math.hypot(t.x - lastX, t.y - lastY) < 1) {
          stuckT += dt;
          if (stuckT > 3) { i++; legPhase = 0; stuckT = 0; return this.update(dt); }
        } else stuckT = 0;
        lastX = t.x;
        lastY = t.y;
        const first = s.first || (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y');
        const firstDone = first === 'x' ? Math.abs(dx) < 8 : Math.abs(dy) < 8;
        if (legPhase === 0 && firstDone) legPhase = 1;
        if (legPhase === 0) {
          return first === 'x'
            ? { x: axis(dx), y: 0, sneak: !!s.sneak, grab: false, done: false }
            : { x: 0, y: axis(dy), sneak: !!s.sneak, grab: false, done: false };
        }
        return first === 'x'
          ? { x: 0, y: axis(dy), sneak: !!s.sneak, grab: false, done: false }
          : { x: axis(dx), y: 0, sneak: !!s.sneak, grab: false, done: false };
      }
      if (s.kind === 'wait') {
        if (s.until(world)) { i++; waitT = 0; return this.update(dt); }
        waitT += dt;
        if (waitT > s.max) { i++; waitT = 0; return this.update(dt); }
        return { x: 0, y: 0, sneak: !!s.sneak, grab: false, done: false };
      }
      if (s.kind === 'grab') {
        const loot = world.loot.find((l) => l.id === s.id);
        if (loot && loot.taken) { i++; grabT = 0; return this.update(dt); }
        grabT += dt;
        if (grabT > 10) { i++; grabT = 0; return this.update(dt); }
        return { x: 0, y: 0, sneak: false, grab: true, done: false };
      }
      // hold: stand still for a while (title scene, cover settle).
      holdT += dt;
      if (holdT >= s.secs) { i++; holdT = 0; return this.update(dt); }
      return { x: 0, y: 0, sneak: false, grab: false, done: false };
    },
  };
}

export const SHOT_NAMES = Object.keys(SCENES);
