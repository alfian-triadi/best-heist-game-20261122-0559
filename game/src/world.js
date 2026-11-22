// The heist simulation: movement, collision, sight lines, suspicion, cameras,
// the alarm meter, loot, coins and the win / caught conditions. Pure logic, no
// drawing and no DOM: render.js draws the state this file owns.
import {
  ALARM, CAMERA, CAMERAS, COIN_HEAR_RANGE, COIN_THROW_RANGE, COINS, EXIT,
  FIELD, GUARD, GUARDS, LOOT, PEDESTALS, SPAWN, THIEF, WALLS,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';
export const SCREEN_PAUSE = 'pause';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_WIN = 4;
export const EVENT_SPOTTED = 8;
export const EVENT_COIN = 16;

function rects() {
  return WALLS.concat(PEDESTALS);
}

function pointInRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

function circleHitsRect(cx, cy, radius, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

// Push a circle out of every rect it overlaps; returns true when it was pushed.
function resolveCircle(pos, radius) {
  let pushed = false;
  for (const r of rects()) {
    if (!circleHitsRect(pos.x, pos.y, radius, r)) continue;
    pushed = true;
    const nx = Math.max(r.x, Math.min(pos.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(pos.y, r.y + r.h));
    let dx = pos.x - nx;
    let dy = pos.y - ny;
    let d = Math.hypot(dx, dy);
    if (d === 0) {
      // Centre inside the rect: push out along the smallest penetration axis.
      const left = pos.x - r.x;
      const right = r.x + r.w - pos.x;
      const top = pos.y - r.y;
      const bottom = r.y + r.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = r.x - radius;
      else if (m === right) pos.x = r.x + r.w + radius;
      else if (m === top) pos.y = r.y - radius;
      else pos.y = r.y + r.h + radius;
      continue;
    }
    dx /= d;
    dy /= d;
    pos.x = nx + dx * radius;
    pos.y = ny + dy * radius;
  }
  return pushed;
}

// True when the segment between two points crosses no wall or pedestal.
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    for (const r of rects()) {
      if (pointInRect(x, y, r)) return false;
    }
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makeGuard(def) {
  const [sx, sy] = def.waypoints[def.startIndex];
  return {
    name: def.name,
    x: sx,
    y: sy,
    waypoints: def.waypoints,
    targetIndex: (def.startIndex + 1) % def.waypoints.length,
    angle: 0,
    suspicion: 0,
    mode: 'patrol', // patrol | chase | investigate
    chaseTime: 0,
    loseSightTime: 0,
    investigateTime: 0,
    investigateX: 0,
    investigateY: 0,
    speed: GUARD.patrolSpeed,
  };
}

export class World {
  constructor(seed) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.state = {
      screen: SCREEN_TITLE,
      thief: { x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, sneaking: false, moving: false },
      guards: GUARDS.map(makeGuard),
      cameras: CAMERAS.map((c) => ({ ...c, angle: c.baseAngle })),
      loot: LOOT.map((l) => ({ ...l, taken: false })),
      lootTaken: 0,
      coins: COINS,
      coin: null, // { x, y, ttl } a tossed coin on the floor
      alarm: 0,
      time: 0,
      spotted: false, // any guard or camera sees the thief right now
      spottedByCamera: false,
      message: '',
      messageTime: 0,
      caughtBy: '',
      winTime: 0,
    };
  }

  get thief() {
    return this.state.thief;
  }

  start() {
    if (this.state.screen === SCREEN_TITLE || this.state.screen === SCREEN_CAUGHT || this.state.screen === SCREEN_WIN) {
      this.reset();
      this.state.screen = SCREEN_PLAY;
      this.state.message = 'Take all four treasures, then slip out the door below.';
      this.state.messageTime = 5;
    } else if (this.state.screen === SCREEN_PAUSE) {
      this.state.screen = SCREEN_PLAY;
    }
  }

  pause() {
    if (this.state.screen === SCREEN_PLAY) this.state.screen = SCREEN_PAUSE;
    else if (this.state.screen === SCREEN_PAUSE) this.state.screen = SCREEN_PLAY;
  }

  throwCoin(tx, ty) {
    const s = this.state;
    if (s.screen !== SCREEN_PLAY || s.coins <= 0) return false;
    const dx = tx - s.thief.x;
    const dy = ty - s.thief.y;
    const d = Math.hypot(dx, dy);
    const range = Math.min(d, COIN_THROW_RANGE);
    const nx = d === 0 ? s.thief.x : s.thief.x + (dx / d) * range;
    const ny = d === 0 ? s.thief.y : s.thief.y + (dy / d) * range;
    s.coin = { x: nx, y: ny, ttl: 6 };
    s.coins -= 1;
    for (const g of s.guards) {
      const gd = Math.hypot(g.x - nx, g.y - ny);
      if (gd < COIN_HEAR_RANGE && g.mode !== 'chase') {
        g.mode = 'investigate';
        g.investigateX = nx;
        g.investigateY = ny;
        g.investigateTime = GUARD.investigateTime;
        g.suspicion = Math.max(0, g.suspicion - 40);
      }
    }
    s.message = 'A coin clinks across the marble…';
    s.messageTime = 2.5;
    return true;
  }

  /** Advance the simulation by dt seconds. input: {x, y, sneak}. Returns an event bitmask. */
  step(dt, input) {
    const s = this.state;
    if (s.screen !== SCREEN_PLAY) return EVENT_NONE;
    let events = EVENT_NONE;
    s.time += dt;
    if (s.messageTime > 0) s.messageTime -= dt;

    // --- thief movement ---
    const t = s.thief;
    const speed = input.sneak ? THIEF.sneakSpeed : THIEF.speed;
    const len = Math.hypot(input.x, input.y);
    t.sneaking = input.sneak;
    t.moving = len > 0;
    if (len > 0) {
      t.x += (input.x / len) * speed * dt;
      t.y += (input.y / len) * speed * dt;
      t.angle = Math.atan2(input.y, input.x);
      t.x = Math.max(THIEF.radius + 1, Math.min(FIELD.width - THIEF.radius - 1, t.x));
      t.y = Math.max(THIEF.radius + 1, Math.min(FIELD.height - THIEF.radius - 1, t.y));
      resolveCircle(t, THIEF.radius);
    }
    if (s.coin) {
      s.coin.ttl -= dt;
      if (s.coin.ttl <= 0) s.coin = null;
    }

    // --- loot pickup ---
    for (const l of s.loot) {
      if (l.taken) continue;
      if (Math.hypot(t.x - l.x, t.y - l.y) < THIEF.radius + 26) {
        l.taken = true;
        s.lootTaken += 1;
        events |= EVENT_PICKUP;
        s.message = `Stole the ${l.name}! (${s.lootTaken}/4)`;
        s.messageTime = 3;
      }
    }

    // --- cameras sweep ---
    s.spottedByCamera = false;
    for (const c of s.cameras) {
      c.angle = c.baseAngle + Math.sin(s.time * CAMERA.sweepSpeed + c.phase) * CAMERA.sweep;
    }

    // --- detection ---
    let seenByGuard = false;
    let anyChase = false;
    let maxSuspicion = 0;
    for (const g of s.guards) {
      const dx = t.x - g.x;
      const dy = t.y - g.y;
      const dist = Math.hypot(dx, dy);
      const inRange = dist < GUARD.coneRange;
      const inCone = inRange && Math.abs(angleDiff(Math.atan2(dy, dx), g.angle)) < GUARD.coneHalfAngle;
      const visible = inCone && hasLineOfSight(g.x, g.y, t.x, t.y);
      if (visible) {
        seenByGuard = true;
        const proximity = 1 - dist / GUARD.coneRange;
        const rate = GUARD.suspicionRate * (0.45 + 0.85 * proximity) * (t.sneaking ? THIEF.sneakSpot : 1);
        g.suspicion = Math.min(100, g.suspicion + rate * dt);
        if (g.suspicion >= 100 && g.mode !== 'chase') {
          g.mode = 'chase';
          g.chaseTime = GUARD.chaseTime;
          g.loseSightTime = GUARD.loseSightTime;
          s.message = `${g.name} spotted you — run!`;
          s.messageTime = 2.5;
        }
      } else {
        g.suspicion = Math.max(0, g.suspicion - GUARD.suspicionDecay * dt);
      }
      maxSuspicion = Math.max(maxSuspicion, g.suspicion);
      if (g.mode === 'chase') anyChase = true;
    }
    for (const c of s.cameras) {
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const dist = Math.hypot(dx, dy);
      const inRange = dist < CAMERA.coneRange;
      const inCone = inRange && Math.abs(angleDiff(Math.atan2(dy, dx), c.angle)) < CAMERA.coneHalfAngle;
      if (inCone && hasLineOfSight(c.x, c.y, t.x, t.y)) {
        s.spottedByCamera = true;
        s.alarm = Math.min(ALARM.max, s.alarm + CAMERA.alarmRate * dt);
      }
    }
    s.spotted = seenByGuard || s.spottedByCamera;
    if (seenByGuard) events |= EVENT_SPOTTED;
    if (s.spotted) {
      s.alarm = Math.min(ALARM.max, s.alarm + (ALARM.guardRate * maxSuspicion) / 100 * dt);
    }
    if (anyChase) {
      s.alarm = Math.min(ALARM.max, s.alarm + ALARM.chaseRate * dt);
    }
    if (!s.spotted && !anyChase) {
      s.alarm = Math.max(0, s.alarm - ALARM.decay * dt);
    }
    if (s.alarm >= ALARM.max) {
      s.screen = SCREEN_CAUGHT;
      s.caughtBy = s.spottedByCamera ? 'the cameras' : 'the guards';
      return events | EVENT_CAUGHT;
    }

    // --- guard movement ---
    for (const g of s.guards) {
      let tx;
      let ty;
      let speed = GUARD.patrolSpeed;
      if (g.mode === 'chase') {
        tx = t.x;
        ty = t.y;
        speed = GUARD.chaseSpeed;
        g.chaseTime -= dt;
        const dist = Math.hypot(t.x - g.x, t.y - g.y);
        const inRange = dist < GUARD.coneRange;
        const inCone = inRange && Math.abs(angleDiff(Math.atan2(t.y - g.y, t.x - g.x), g.angle)) < GUARD.coneHalfAngle;
        if (inCone && hasLineOfSight(g.x, g.y, t.x, t.y)) g.loseSightTime = GUARD.loseSightTime;
        else g.loseSightTime -= dt;
        if (g.chaseTime <= 0 || g.loseSightTime <= 0) {
          g.mode = 'patrol';
          g.suspicion = 45;
        }
      } else if (g.mode === 'investigate') {
        tx = g.investigateX;
        ty = g.investigateY;
        g.investigateTime -= dt;
        if (g.investigateTime <= 0 || Math.hypot(tx - g.x, ty - g.y) < 12) {
          g.mode = 'patrol';
        }
      } else {
        const wp = g.waypoints[g.targetIndex];
        tx = wp[0];
        ty = wp[1];
        if (Math.hypot(tx - g.x, ty - g.y) < 10) {
          g.targetIndex = (g.targetIndex + 1) % g.waypoints.length;
        }
      }
      const dx = tx - g.x;
      const dy = ty - g.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.5) {
        const stepLen = Math.min(d, speed * dt);
        g.x += (dx / d) * stepLen;
        g.y += (dy / d) * stepLen;
        g.angle = Math.atan2(dy, dx);
      }
    }

    // --- caught by touch: a guard that reaches the thief ends the run ---
    for (const g of s.guards) {
      if (Math.hypot(t.x - g.x, t.y - g.y) < GUARD.radius + THIEF.radius - 2) {
        s.screen = SCREEN_CAUGHT;
        s.caughtBy = g.name;
        return events | EVENT_CAUGHT;
      }
    }

    // --- win: all loot, then reach the exit door ---
    if (s.lootTaken === LOOT.length && t.y > EXIT.y - 6 && t.x > EXIT.x - 10 && t.x < EXIT.x + EXIT.w + 10) {
      s.screen = SCREEN_WIN;
      s.winTime = s.time;
      return events | EVENT_WIN;
    }
    return events;
  }
}
