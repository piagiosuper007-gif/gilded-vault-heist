// The Gilded Vault — boot and the main loop. Reads the seed and shot
// parameters from the page address, runs the fixed 1/60s loop with a cap
// on catch-up time, moves between the six screens, announces screen
// changes and grabs on a live status line, pauses when the tab hides,
// and keeps the best score in local storage.
import { W, H } from './config.js';
import { createWorld, updateWorld, resetRun, lootValue } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { sound } from './sound.js';
import { createShotDriver } from './shots.js';

const BEST_KEY = 'gilded-vault-best';
const DT = 1 / 60;

function params() {
  return new URLSearchParams(window.location.search);
}

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // A screenshot run or a locked-down browser may refuse storage.
  }
}

export function boot() {
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');
  const ctx = canvas.getContext('2d');
  const q = params();
  const seed = Number(q.get('seed') || '1') || 1;
  const shotName = q.get('shot');
  const world = createWorld(seed);
  const input = createInput();
  input.attach();

  let best = loadBest();
  let driver = null;
  let shotDone = false;
  let paintCount = 0;

  if (shotName) {
    world.screen = shotName === 'start' ? 'title' : 'play';
    driver = createShotDriver(world, shotName);
  }

  function announce(msg) {
    if (status) status.textContent = msg;
  }

  function setScreen(s) {
    world.screen = s;
    if (s === 'play') announce('Playing. Steal the relics, crack the vault, get out.');
    else if (s === 'paused') announce('Paused.');
    else if (s === 'caught') { announce('Caught! One attempt lost.'); sound.caught(); }
    else if (s === 'gameover') announce('Game over. The crew got pinched.');
    else if (s === 'win') {
      announce(`Clean getaway! Total $${world.score.total.toLocaleString()}.`);
      sound.win();
      if (world.score.total > best) { best = world.score.total; saveBest(best); }
    }
  }

  function frame(dt) {
    if (driver) {
      const axes = driver.update(dt);
      updateWorld(world, axes, dt);
      if (axes.done && !shotDone) {
        shotDone = true;
        // Paint twice, then tell the screenshot tool the frame is ready.
        render(ctx, world, best);
        render(ctx, world, best);
        paintCount = 2;
        window.__shotReady = true;
        window.__shotInfo = {
          scene: shotName,
          screen: world.screen,
          alarm: Math.round(world.alarm),
          maxAlarm: Math.round(world.maxAlarm),
          loot: lootValue(world),
          score: world.score,
          attempts: world.attempts,
        };
      }
      return;
    }

    if (input.takeMute()) sound.toggleMute();
    const s = world.screen;
    if (s === 'title') {
      updateWorld(world, { x: 0, y: 0, sneak: false, grab: false }, dt);
      if (input.takeConfirm()) { sound.blip(); resetRun(world); setScreen('play'); }
    } else if (s === 'play') {
      if (input.takePause()) { setScreen('paused'); sound.blip(); return; }
      const before = world.events.length;
      updateWorld(world, input.axes(), dt);
      const fresh = world.events.slice(before);
      if (fresh.some((e) => e.startsWith('grab:'))) {
        const id = fresh.find((e) => e.startsWith('grab:')).slice(5);
        announce(`Pocketed the ${id}. Loot $${lootValue(world).toLocaleString()}.`);
        sound.grab();
      }
      if (fresh.includes('vault')) { announce('The vault is open!'); sound.vault(); }
      if (fresh.includes('spotted')) sound.sting();
      if (world.screen !== 'play') setScreen(world.screen);
    } else if (s === 'paused') {
      if (input.takePause() || input.takeConfirm()) { setScreen('play'); sound.blip(); }
    } else if (s === 'caught') {
      if (input.takeConfirm()) { setScreen('play'); sound.blip(); }
    } else if (s === 'gameover') {
      if (input.takeConfirm()) { resetRun(world); setScreen('play'); sound.blip(); }
    } else if (s === 'win') {
      if (input.takeConfirm()) { resetRun(world); setScreen('title'); sound.blip(); }
    }
  }

  canvas.addEventListener('click', () => {
    if (world.screen === 'title') { resetRun(world); setScreen('play'); }
    else if (world.screen === 'caught') setScreen('play');
    else if (world.screen === 'gameover') { resetRun(world); setScreen('play'); }
    else if (world.screen === 'win') { resetRun(world); setScreen('title'); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === 'play' && !driver) setScreen('paused');
  });

  let last = performance.now();
  let acc = 0;
  function loop(now) {
    // Shot mode: fast-forward the scripted run without painting every
    // frame — headless software rendering runs far slower than real time,
    // so the scene is stepped in big chunks and painted only when done.
    if (driver && !shotDone) {
      let n = 0;
      while (!shotDone && n < 6000) {
        frame(DT);
        n++;
      }
      if (!shotDone) requestAnimationFrame(loop);
      return;
    }
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    let steps = 0;
    while (acc >= DT && steps < 5) {
      frame(DT);
      acc -= DT;
      steps++;
      if (shotDone) break;
    }
    if (acc >= DT) acc = 0; // drop catch-up time past the cap
    if (!shotDone) render(ctx, world, best);
    if (!shotDone) requestAnimationFrame(loop);
  }
  render(ctx, world, best);
  requestAnimationFrame(loop);
}
