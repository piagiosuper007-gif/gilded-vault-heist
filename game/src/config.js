// The Gilded Vault — tuning, colours, floor plan, loot, guards and cameras.
// One job: every number the world and the renderer agree on lives here.
export const W = 1280;
export const H = 720;
export const WALL_T = 24;
export const DOOR_X0 = 600;
export const DOOR_X1 = 680;

export const COLORS = {
  floorA: '#252f42',
  floorB: '#1e2736',
  grout: '#161d2a',
  carpet: '#7a1f2b',
  carpetEdge: '#c9a227',
  rug: '#5d1a24',
  wall: '#3a4358',
  wallTop: '#4d5872',
  wallGold: '#c9a227',
  plinth: '#565e70',
  plinthTop: '#7d8698',
  glass: 'rgba(180, 210, 235, 0.16)',
  gold: '#e8b93c',
  jade: '#3fae7a',
  sapphire: '#4f8ef7',
  thiefCloak: '#1c1a26',
  thiefTrim: '#e8b93c',
  guardUniform: '#2c4a6b',
  guardCap: '#1d3247',
  coneGuard: 'rgba(255, 214, 90, 0.20)',
  coneGuardEdge: 'rgba(255, 214, 90, 0.45)',
  coneCamera: 'rgba(255, 70, 70, 0.16)',
  coneCameraEdge: 'rgba(255, 70, 70, 0.4)',
  coneAlert: 'rgba(255, 40, 40, 0.34)',
  coneAlertEdge: 'rgba(255, 40, 40, 0.7)',
  hud: 'rgba(10, 13, 22, 0.82)',
  panel: 'rgba(12, 15, 26, 0.94)',
  panelEdge: '#c9a227',
  text: '#f2ead8',
  muted: '#a9b2c4',
};

// Rects are {x, y, w, h}. Sight blockers stop vision; movement blockers stop feet.
// Benches and plinths block movement only, guards see over them.
const wall = (x, y, w, h) => ({ x, y, w, h, sight: true });
const block = (x, y, w, h) => ({ x, y, w, h, sight: false });

export const WALLS = [
  wall(0, 0, W, WALL_T), // top
  wall(0, 0, WALL_T, H), // left
  wall(W - WALL_T, 0, WALL_T, H), // right
  wall(0, H - WALL_T, DOOR_X0, WALL_T), // bottom, west of the door
  wall(DOOR_X1, H - WALL_T, W - DOOR_X1, WALL_T), // bottom, east of the door
  wall(292, WALL_T, 16, 256), // left gallery east wall, upper run (y 24..280)
  wall(292, 340, 16, 180), // left gallery east wall, lower run (y 340..520)
  wall(972, WALL_T, 16, 176), // vault west wall, upper run (y 24..200)
  wall(972, 260, 16, 120), // vault west wall, lower run (y 260..380)
  wall(980, 372, 140, 16), // vault south wall, west run (x 980..1120)
  wall(1180, 372, 76, 16), // vault south wall, east run (x 1180..1256)
  wall(480, 280, 40, 40), // marble pillar, central hall west
  wall(720, 280, 40, 40), // marble pillar, central hall east
];

export const FURNITURE = [
  block(370, 547, 120, 26), // bench, bottom corridor west
  block(670, 547, 120, 26), // bench, bottom corridor east
  block(142, 150, 56, 40), // plinth under the Scarab
  block(612, 390, 56, 40), // plinth under the Mask
  block(852, 150, 56, 40), // plinth under the Sapphire
  block(1102, 180, 56, 40), // plinth under the Vault Cache
];

export const SIGHT_BLOCKERS = WALLS;
export const MOVE_BLOCKERS = [...WALLS, ...FURNITURE];

export const LOOT = [
  { id: 'scarab', name: 'Golden Scarab', value: 12000, x: 170, y: 170 },
  { id: 'mask', name: 'Jade Mask', value: 18000, x: 640, y: 410 },
  { id: 'sapphire', name: 'Star Sapphire', value: 25000, x: 880, y: 170 },
  { id: 'cache', name: 'Vault Cache', value: 60000, x: 1130, y: 200 },
];
export const VAULT_NEEDS = 3; // relics pocketed before the Cache can be taken

export const GUARDS = [
  {
    name: 'Marco', speed: 65, pause: 1.4, range: 205, halfAngle: 0.5,
    loop: [[420, 170], [860, 170], [860, 540], [420, 540]],
  },
  {
    name: 'Rosa', speed: 60, pause: 1.2, range: 200, halfAngle: 0.5,
    loop: [[110, 120], [240, 120], [240, 480], [110, 480]],
  },
  {
    name: 'Vince', speed: 65, pause: 1.4, range: 205, halfAngle: 0.5,
    loop: [[1020, 440], [1210, 440], [1210, 620], [1020, 620]],
  },
];

export const CAMERAS = [
  { x: 640, y: 26, base: Math.PI / 2, sweep: 0.9, period: 5, range: 250, halfAngle: 0.4 },
  { x: 1254, y: 210, base: Math.PI, sweep: 0.7, period: 4.2, range: 240, halfAngle: 0.4 },
];

export const THIEF = {
  startX: 640, startY: 660, radius: 13,
  walkSpeed: 175, sneakSpeed: 95, chaseSpeed: 132,
  grabTime: 0.8, grabRadius: 60,
};

export const ALARM = {
  guardSeen: 45, cameraSeen: 35, heardRunning: 10, hearRange: 130,
  sneakFactor: 0.55, proximity: 0.6, decay: 10, max: 100,
  bannerAt: 70, ghostBelow: 50, caughtReset: 40,
};

export const SCORE = {
  timeLimit: 300, timePerSecond: 20, ghostBonus: 500, attempts: 3,
};

export const DUST_SEED = 20261122;
export const DUST_COUNT = 70;
