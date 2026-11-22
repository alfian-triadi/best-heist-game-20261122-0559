// The screenshot scenes behind ?shot=start|play|alert|win. Each one stages a
// real, reachable game state — the same world, the same renderer, no edits —
// and returns the screen to draw over it. The states are placed, not played:
// a staged frame must show the whole room, the guards and their cones, the
// cameras, a loot target and the alarm meter in one frame, every time.
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

function setGuard(g, x, y, angle, suspicion, mode) {
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.suspicion = suspicion;
  g.mode = mode;
  if (mode === 'chase') {
    g.chaseTime = 3;
    g.loseSightTime = 2;
  }
}

/**
 * Set `world` to the named scene (start, play, alert or win; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  const st = world.state;
  if (name === 'win') {
    for (const l of st.loot) l.taken = true;
    st.lootTaken = 4;
    st.thief.x = 640;
    st.thief.y = 668;
    st.thief.angle = Math.PI / 2;
    st.alarm = 18;
    st.time = 214;
    setGuard(st.guards[0], 700, 300, Math.PI, 0, 'patrol');
    setGuard(st.guards[1], 520, 480, -Math.PI / 2, 0, 'patrol');
    setGuard(st.guards[2], 760, 200, Math.PI / 2, 0, 'patrol');
    st.screen = SCREEN_WIN;
    st.winTime = 214;
    return { screen: SCREEN_WIN };
  }
  if (name === 'alert') {
    st.loot[0].taken = true;
    st.lootTaken = 1;
    st.thief.x = 560;
    st.thief.y = 300;
    st.thief.angle = 0;
    st.alarm = 72;
    st.time = 96;
    st.spotted = true;
    setGuard(st.guards[0], 480, 300, 0, 100, 'chase');
    setGuard(st.guards[1], 520, 470, -Math.PI / 2, 62, 'patrol');
    setGuard(st.guards[2], 760, 220, Math.PI / 2, 0, 'patrol');
    st.message = 'Bram spotted you — run!';
    st.messageTime = 5;
    st.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'play') {
    st.loot[0].taken = true;
    st.lootTaken = 1;
    st.thief.x = 700;
    st.thief.y = 420;
    st.thief.angle = -Math.PI / 4;
    st.thief.sneaking = true;
    st.alarm = 12;
    st.time = 58;
    st.coin = { x: 820, y: 300, ttl: 5 };
    st.coins = 2; // one coin already tossed, lying on the floor
    setGuard(st.guards[0], 560, 300, 0, 38, 'patrol');
    setGuard(st.guards[1], 520, 470, Math.PI / 2, 0, 'investigate');
    st.guards[1].investigateX = 820;
    st.guards[1].investigateY = 300;
    st.guards[1].investigateTime = 2;
    setGuard(st.guards[2], 760, 420, -Math.PI / 2, 0, 'patrol');
    st.message = 'Stole the Star Sapphire! (1/4)';
    st.messageTime = 5;
    st.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }
  // start: the title screen over the fresh room.
  st.thief.x = 640;
  st.thief.y = 640;
  st.thief.angle = -Math.PI / 2;
  st.time = 2;
  setGuard(st.guards[0], 640, 300, 0, 0, 'patrol');
  setGuard(st.guards[1], 520, 380, Math.PI / 2, 0, 'patrol');
  setGuard(st.guards[2], 760, 380, -Math.PI / 2, 0, 'patrol');
  st.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE };
}
