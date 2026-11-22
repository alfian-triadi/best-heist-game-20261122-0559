// All drawing: the gallery floor, walls, pedestals, loot, the thief, guards with
// their vision cones, sweeping cameras, the exit — and the title, caught, win
// and pause screens painted over the same frame.
import {
  ALARM, CAMERA, EXIT, FIELD, GUARD, LOOT, PEDESTALS, THIEF, WALLS,
} from './config.js';
import {
  SCREEN_CAUGHT, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './world.js';

const LOOT_GLYPH = { sapphire: '◆', idol: '♛', mask: '◉', pearl: '●' };

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawCone(ctx, x, y, angle, halfAngle, range, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawFloor(ctx) {
  ctx.fillStyle = '#1b1626';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Marble tiles.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 24; x < FIELD.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, FIELD.height - 24);
    ctx.stroke();
  }
  for (let y = 24; y < FIELD.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(FIELD.width - 24, y);
    ctx.stroke();
  }
  // Crimson carpet runner down the middle.
  ctx.fillStyle = '#4a1620';
  ctx.fillRect(596, 24, 88, 672);
  ctx.fillStyle = '#6b1f2c';
  ctx.fillRect(600, 24, 80, 672);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.strokeRect(600, 24, 80, 672);
  // Wall shadows.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 24, FIELD.width, 6);
}

function drawWalls(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = '#3d3247';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#574a68';
    ctx.fillRect(w.x, w.y, w.w, Math.min(4, w.h));
    ctx.strokeStyle = '#241d2e';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
  // Exit door: a gilded gap in the bottom wall.
  ctx.fillStyle = '#0e2a18';
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', EXIT.x + EXIT.w / 2, EXIT.y - 14);
}

function drawPedestalsAndLoot(ctx, state) {
  for (const p of PEDESTALS) {
    ctx.fillStyle = '#2c2438';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#4a3f5c';
    ctx.fillRect(p.x, p.y, p.w, 6);
    ctx.strokeStyle = '#171221';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  }
  for (const l of state.loot) {
    if (l.taken) continue;
    const pulse = 1 + Math.sin(state.time * 3 + l.x) * 0.08;
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,175,55,0.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = l.color;
    ctx.fill();
    ctx.fillStyle = '#14101c';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOOT_GLYPH[l.id] ?? '◆', 0, 0.5);
    ctx.restore();
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x, l.y + 34);
  }
}

function drawCameras(ctx, state) {
  for (const c of state.cameras) {
    drawCone(ctx, c.x, c.y, c.angle, CAMERA.coneHalfAngle, CAMERA.coneRange, 'rgba(255,80,80,0.10)');
    ctx.strokeStyle = 'rgba(255,90,90,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.arc(c.x, c.y, CAMERA.coneRange, c.angle - CAMERA.coneHalfAngle, c.angle + CAMERA.coneHalfAngle);
    ctx.stroke();
    // Wall mount + lens.
    ctx.fillStyle = '#5a5148';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state.spottedByCamera ? '#ff3b30' : '#ff6b5e';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 12, c.y + Math.sin(c.angle) * 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    const alert = g.mode === 'chase';
    const suspicious = g.suspicion > 1;
    const coneFill = alert
      ? 'rgba(255,60,50,0.28)'
      : suspicious
        ? 'rgba(255,170,40,0.20)'
        : 'rgba(255,220,120,0.13)';
    drawCone(ctx, g.x, g.y, g.angle, GUARD.coneHalfAngle, GUARD.coneRange, coneFill);
    ctx.strokeStyle = alert ? 'rgba(255,60,50,0.5)' : 'rgba(255,220,120,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, GUARD.coneRange, g.angle - GUARD.coneHalfAngle, g.angle + GUARD.coneHalfAngle);
    ctx.stroke();
    // Guard body: navy uniform, cap brim toward facing.
    ctx.fillStyle = alert ? '#8c1f1f' : '#2c4a6b';
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 6, g.y + Math.sin(g.angle) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion / alert mark.
    if (alert) {
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 26);
    } else if (suspicious) {
      ctx.fillStyle = '#ffb020';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 26);
    }
    ctx.fillStyle = '#c9b98a';
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y + 28);
    // Suspicion bar.
    if (g.suspicion > 1) {
      ctx.fillStyle = '#241d16';
      ctx.fillRect(g.x - 18, g.y + 32, 36, 5);
      ctx.fillStyle = g.suspicion > 70 ? '#ff3b30' : '#ffb020';
      ctx.fillRect(g.x - 18, g.y + 32, (36 * g.suspicion) / 100, 5);
    }
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  const blink = state.spotted && Math.floor(state.time * 6) % 2 === 0;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 10, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded cloak: triangle pointing where the thief faces.
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.angle);
  ctx.fillStyle = blink ? '#7a2a2a' : '#3a3f5c';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (t.sneaking) {
    ctx.fillStyle = '#c9b98a';
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking…', t.x, t.y - 24);
  }
}

function drawCoin(ctx, state) {
  if (!state.coin) return;
  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(state.coin.x, state.coin.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff2b0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(state.coin.x, state.coin.y, 9, 0, Math.PI * 2);
  ctx.stroke();
}

function drawObjective(ctx, state) {
  ctx.fillStyle = 'rgba(11,10,18,0.72)';
  ctx.fillRect(24, 34, 330, 30);
  ctx.strokeStyle = '#3a2f1e';
  ctx.strokeRect(24.5, 34.5, 330, 30);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const goal = state.lootTaken === LOOT.length
    ? 'All loot taken — reach the EXIT!'
    : `Steal the ${LOOT.length - state.lootTaken} remaining treasure${LOOT.length - state.lootTaken === 1 ? '' : 's'}`;
  ctx.fillText(goal, 36, 50);
}

function drawAlarmVignette(ctx, state) {
  if (state.alarm <= 0) return;
  const a = Math.min(0.45, (state.alarm / ALARM.max) * 0.45);
  const g = ctx.createRadialGradient(640, 360, 240, 640, 360, 640);
  g.addColorStop(0, 'rgba(255,40,30,0)');
  g.addColorStop(1, `rgba(255,40,30,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function drawOverlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(8,7,14,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(title, 640, 250);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '19px Georgia, serif';
  let y = 320;
  for (const line of lines) {
    ctx.fillText(line, 640, y);
    y += 32;
  }
  ctx.fillStyle = '#c9b98a';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText(hint, 640, y + 30);
}

/** Draw one frame of the game for the given world state. */
export function render(ctx, world) {
  const state = world.state;
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawFloor(ctx);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawPedestalsAndLoot(ctx, state);
  drawWalls(ctx);
  drawCoin(ctx, state);
  drawThief(ctx, state);
  drawAlarmVignette(ctx, state);
  if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSE) {
    drawObjective(ctx, state);
  }
  if (state.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'THE GILDED VAULT', [
      'Midnight at the Marlow Gallery. Four treasures, three guards,',
      'two sweeping cameras — and one very nervous alarm meter.',
      'Steal everything, then slip out the door below.',
    ], 'Press Enter to begin  ·  WASD move  ·  Shift sneak  ·  Click toss a coin');
  } else if (state.screen === SCREEN_CAUGHT) {
    drawOverlay(ctx, 'CAUGHT!', [
      `The alarm hit 100% — ${state.caughtBy} ended the heist.`,
      `Loot stolen: ${state.lootTaken}/4  ·  Time: ${fmtTime(state.time)}`,
    ], 'Press Enter to try again');
  } else if (state.screen === SCREEN_WIN) {
    const rating = state.alarm < 10 ? 'Ghost — never raised the alarm' : state.alarm < 40 ? 'Clean getaway' : 'Loud, but rich';
    drawOverlay(ctx, 'CLEAN GETAWAY!', [
      `All four treasures, out the door in ${fmtTime(state.winTime)}.`,
      `${rating}. Final alarm: ${Math.round(state.alarm)}%.`,
    ], 'Press Enter to play again');
  } else if (state.screen === SCREEN_PAUSE) {
    drawOverlay(ctx, 'PAUSED', ['The gallery waits. The guards do not.'], 'Press P to resume');
  }
}

/** Sync the DOM HUD (loot, coins, alarm meter, timer, message) with the state. */
export function renderHud(doc, world) {
  const s = world.state;
  const loot = doc.getElementById('hud-loot');
  if (loot) loot.textContent = `Loot ${s.lootTaken}/4`;
  const coins = doc.getElementById('hud-coins');
  if (coins) coins.textContent = `Coins ${s.coins}`;
  const fill = doc.getElementById('hud-alarm-fill');
  if (fill) {
    fill.style.width = `${s.alarm}%`;
    fill.style.background = s.alarm >= 75 ? '#ff3b30' : s.alarm >= 40 ? '#ffb020' : '#3fae5a';
  }
  const pct = doc.getElementById('hud-alarm-pct');
  if (pct) pct.textContent = `${Math.round(s.alarm)}%`;
  const timer = doc.getElementById('hud-timer');
  if (timer) timer.textContent = fmtTime(s.screen === SCREEN_WIN ? s.winTime : s.time);
  const msg = doc.getElementById('hud-message');
  if (msg) {
    if (s.messageTime > 0) msg.textContent = s.message;
    else if (s.screen === SCREEN_TITLE) msg.textContent = 'Press Enter to begin the heist';
    else if (s.screen === SCREEN_CAUGHT) msg.textContent = 'Caught! Press Enter to try again';
    else if (s.screen === SCREEN_WIN) msg.textContent = 'Clean getaway! Press Enter to play again';
    else if (s.screen === SCREEN_PAUSE) msg.textContent = 'Paused — press P to resume';
    else msg.textContent = s.lootTaken === LOOT.length ? 'All loot taken — reach the EXIT!' : 'Stay out of the cones. Mind the cameras.';
  }
}
