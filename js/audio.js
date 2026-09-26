// Tiny WebAudio synth for retro sound effects — no samples needed.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // Browsers require a user gesture before audio can start.
  resume() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone({ freq = 440, dur = 0.08, type = 'square', gain = 0.12, slide = 0 }) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  paddle() { this.tone({ freq: 320, dur: 0.06, slide: 120, gain: 0.15 }); }
  wall()   { this.tone({ freq: 220, dur: 0.05, type: 'triangle', gain: 0.1 }); }
  brick(hue = 0) {
    // pitch rises with the brick's hue so higher rows sound brighter
    this.tone({ freq: 420 + hue * 3, dur: 0.07, type: 'square', gain: 0.13, slide: 90 });
  }
  brickBreak() { this.tone({ freq: 660, dur: 0.12, type: 'sawtooth', gain: 0.1, slide: -400 }); }
  lose()   { this.tone({ freq: 200, dur: 0.5, type: 'sawtooth', gain: 0.16, slide: -160 }); }
  win()    {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.tone({ freq: f, dur: 0.18, gain: 0.14 }), i * 130));
  }
}
