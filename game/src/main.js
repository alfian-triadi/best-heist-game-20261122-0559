// The Gilded Vault — a midnight heist. Top-down stealth in a museum gallery:
// steal all four treasures past patrolling guards and sweeping cameras, watch
// the alarm meter, and slip out the door below.
//
// ?seed=N fixes the guard patrol jitter. ?shot=start|play|alert|win (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { World, SCREEN_PLAY, EVENT_CAUGHT, EVENT_PICKUP, EVENT_SPOTTED, EVENT_WIN, EVENT_COIN } from './world.js';
import { render, renderHud } from './render.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) ? seedParam : 20261122;
const shot = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const world = new World(seed);
const input = new Input(canvas);
const audio = new Audio();

// Exposed for play-testing and screenshots: the live world, and a flag the
// screenshot scenes set once the staged frame has been painted.
window.__heist = world;
window.__shotReady = false;

input.onKey = (code) => {
  audio.ensure();
  if (code === 'Enter') {
    if (world.state.screen === SCREEN_PLAY) return;
    world.start();
  } else if (code === 'KeyP') {
    world.pause();
  } else if (code === 'KeyM') {
    audio.toggleMute();
  } else if (code === 'KeyR') {
    world.reset();
    world.start();
  }
};
input.onCoin = (x, y) => {
  audio.ensure();
  if (world.throwCoin(x, y)) audio.coin();
};

let lastSpotted = false;
function handleEvents(events) {
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_SPOTTED && !lastSpotted) audio.spotted();
  if (events & EVENT_CAUGHT) audio.caught();
  if (events & EVENT_WIN) audio.win();
  lastSpotted = world.state.spotted;
}

function runShot(name) {
  const staged = stageShot(name, world);
  void staged;
  // Paint twice so fonts and layout settle, then signal the screenshot.
  render(ctx, world);
  renderHud(document, world);
  render(ctx, world);
  renderHud(document, world);
  window.__shotReady = true;
}

if (shot) {
  runShot(shot);
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      const events = world.step(STEP, input.vector());
      handleEvents(events);
      acc -= STEP;
    }
    render(ctx, world);
    renderHud(document, world);
    requestAnimationFrame(frame);
  }
  render(ctx, world);
  renderHud(document, world);
  requestAnimationFrame(frame);
}
