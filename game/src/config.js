// Every tuning number and the whole room layout in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 14,
  speed: 235,
  sneakSpeed: 130,
  // Detection rate multiplier while sneaking.
  sneakSpot: 0.5,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 95,
  chaseSpeed: 265,
  // Vision cone: half-angle and range, in world units.
  coneHalfAngle: 0.55,
  coneRange: 250,
  // Suspicion gained per second while the thief is inside the cone and in sight.
  suspicionRate: 62,
  suspicionDecay: 26,
  // Seconds a guard chases once suspicion maxes out, and how long it keeps
  // chasing after losing sight before giving up.
  chaseTime: 4,
  loseSightTime: 2,
  // Seconds a guard spends investigating a tossed coin.
  investigateTime: 3,
};

export const CAMERA = {
  coneHalfAngle: 0.42,
  coneRange: 280,
  // Alarm gained per second while a camera sees the thief.
  alarmRate: 22,
  // Sweep: base angle and how far it swings each side, in radians.
  sweep: 0.6,
  sweepSpeed: 0.55,
};

export const ALARM = {
  // Alarm gained per second while a guard's suspicion is above zero (scaled by suspicion).
  guardRate: 8,
  // Alarm gained per second while any guard is chasing.
  chaseRate: 30,
  // Alarm lost per second while nothing sees the thief.
  decay: 5,
  max: 100,
};

export const COINS = 3;
export const COIN_THROW_RANGE = 280;
export const COIN_HEAR_RANGE = 340;

// Walls and pedestals: rectangles that block movement and sight. The outer
// walls are the room's border; the exit gap is cut from the bottom wall.
export const WALLS = [
  { x: 0, y: 0, w: 1280, h: 24 }, // top
  { x: 0, y: 0, w: 24, h: 720 }, // left
  { x: 1256, y: 0, w: 24, h: 720 }, // right
  { x: 0, y: 696, w: 595, h: 24 }, // bottom, left of exit
  { x: 685, y: 696, w: 595, h: 24 }, // bottom, right of exit
  { x: 420, y: 120, w: 24, h: 300 }, // gallery divider, upper left
  { x: 836, y: 300, w: 24, h: 300 }, // gallery divider, lower right
  { x: 560, y: 180, w: 340, h: 24 }, // gallery divider, top middle
];

export const PEDESTALS = [
  { x: 268, y: 118, w: 64, h: 44 },
  { x: 948, y: 118, w: 64, h: 44 },
  { x: 268, y: 528, w: 64, h: 44 },
  { x: 948, y: 528, w: 64, h: 44 },
  { x: 608, y: 340, w: 64, h: 44 },
];

export const LOOT = [
  { id: 'sapphire', name: 'Star Sapphire', x: 300, y: 140, color: '#5ec8f2', value: 1 },
  { id: 'idol', name: 'Golden Idol', x: 980, y: 140, color: '#f2c14e', value: 1 },
  { id: 'mask', name: 'Jade Mask', x: 300, y: 550, color: '#4ecb71', value: 1 },
  { id: 'pearl', name: 'Moon Pearl', x: 980, y: 550, color: '#e8e4f2', value: 1 },
];

export const GUARDS = [
  { name: 'Bram', waypoints: [[480, 300], [800, 300]], startIndex: 0 },
  { name: 'Odo', waypoints: [[520, 260], [520, 560]], startIndex: 0 },
  { name: 'Sable', waypoints: [[760, 260], [760, 560]], startIndex: 1 },
];

export const CAMERAS = [
  { x: 640, y: 24, baseAngle: Math.PI / 2, phase: 0 },
  { x: 24, y: 360, baseAngle: 0, phase: 2.1 },
];

export const SPAWN = { x: 640, y: 640 };
export const EXIT = { x: 595, y: 696, w: 90, h: 24 };
