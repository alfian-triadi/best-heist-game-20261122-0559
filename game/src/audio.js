// Synthesised WebAudio sounds: no audio files, nothing loaded over the network.
// Every effect is a short oscillator envelope, created on first user gesture.
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type, gain, when = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  pickup() {
    this.tone(880, 0.18, 'sine', 0.16);
    this.tone(1318, 0.24, 'sine', 0.12, 0.07);
  }

  coin() {
    this.tone(2093, 0.1, 'triangle', 0.12);
    this.tone(1568, 0.14, 'triangle', 0.1, 0.06);
  }

  spotted() {
    this.tone(220, 0.35, 'sawtooth', 0.1);
    this.tone(233, 0.35, 'sawtooth', 0.1, 0.12);
  }

  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.14);
    this.tone(147, 0.7, 'sawtooth', 0.14, 0.2);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, i * 0.11));
  }
}
