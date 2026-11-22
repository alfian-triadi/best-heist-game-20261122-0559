// Keyboard and mouse input: WASD / arrows to move, Shift to sneak, click or
// Space to toss a coin toward the mouse, Enter to start, P to pause, M to mute,
// R to restart.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this.onKey = null; // (code) => void, for one-shot keys
    this.onCoin = null; // (x, y) => void, world coordinates of a coin toss

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.code);
        if (this.onKey) this.onKey(e.code);
        if (e.code === 'Space' && this.onCoin) this.onCoin(this.mouse.x, this.mouse.y);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * canvas.width;
      const y = ((e.clientY - r.top) / r.height) * canvas.height;
      if (this.onCoin) this.onCoin(x, y);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  /** Movement vector for this frame, in world units, plus whether sneaking. */
  vector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    return { x, y, sneak: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') };
  }
}
