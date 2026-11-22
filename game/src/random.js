// Tiny seeded random: the same seed always draws the same dust and glints,
// so a staged scene looks identical on every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededPoints(seed, count, w, h) {
  const rand = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < count; i++) {
    pts.push({ x: rand() * w, y: rand() * h, r: 0.8 + rand() * 1.8, p: rand() * Math.PI * 2 });
  }
  return pts;
}
