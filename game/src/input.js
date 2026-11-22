// The Gilded Vault — keyboard input. Held keys steer, sneak and grab;
// one-shot presses (confirm, pause, mute) are queued as flags the main
// loop takes once per frame, so a single keypress never fires twice.
export function createInput() {
  const held = new Set();
  const pressed = { confirm: false, pause: false, mute: false };

  const CONFIRM = new Set(['Space', 'Enter']);
  const PAUSE = new Set(['KeyP', 'Escape']);

  function onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    if (CONFIRM.has(e.code)) pressed.confirm = true;
    if (PAUSE.has(e.code)) pressed.pause = true;
    if (e.code === 'KeyM') pressed.mute = true;
  }
  function onKeyUp(e) {
    held.delete(e.code);
  }

  return {
    attach() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    },
    // Axes in -1..1 plus sneak/grab, for the world step.
    axes() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      return {
        x, y,
        sneak: held.has('ShiftLeft') || held.has('ShiftRight'),
        grab: held.has('Space'),
      };
    },
    takeConfirm() { const v = pressed.confirm; pressed.confirm = false; return v; },
    takePause() { const v = pressed.pause; pressed.pause = false; return v; },
    takeMute() { const v = pressed.mute; pressed.mute = false; return v; },
    // The shot driver writes straight into this object instead of keys.
    inject(axes) {
      return axes;
    },
  };
}
