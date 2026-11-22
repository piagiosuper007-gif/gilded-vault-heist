// The Gilded Vault — synthesised sound. No audio files: every cue is a
// few oscillator notes. Every call is safe when audio is unavailable or
// the page is a screenshot scene (no context, no user gesture yet).
let ctx = null;
let muted = false;

function ac() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function note(freq, at, dur, type = 'sine', vol = 0.12) {
  const c = ac();
  if (!c || muted) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + at);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + at);
    o.stop(c.currentTime + at + dur + 0.05);
  } catch {
    // Silence is fine: a missing beep never breaks the game.
  }
}

export const sound = {
  get muted() { return muted; },
  toggleMute() { muted = !muted; return muted; },
  // A blip for a button press.
  blip() { note(660, 0, 0.08, 'square', 0.05); },
  // Two-note chime for a grab.
  grab() { note(523, 0, 0.14); note(784, 0.12, 0.2); },
  // Three-note chime when the vault opens.
  vault() { note(523, 0, 0.14); note(659, 0.12, 0.14); note(784, 0.24, 0.26); },
  // Rising sting when first spotted.
  sting() { note(220, 0, 0.16, 'sawtooth', 0.08); note(330, 0.1, 0.2, 'sawtooth', 0.08); },
  // Low buzz when caught.
  caught() { note(110, 0, 0.4, 'sawtooth', 0.1); note(98, 0.1, 0.4, 'sawtooth', 0.1); },
  // Four-note arpeggio for the getaway.
  win() { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.13, 0.22)); },
};
