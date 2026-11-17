// The audio engine: owns the Web Audio context, the volume buses, the mute switch and the two
// synthesis primitives (a note and a noise burst) that sfx.js and music.js build on. No audio files.

import { playSfx } from './sfx.js';
import { startMusic } from './music.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.swingGain = null;
    this.swingFilter = null;
    this.intensity = 0;
    this.musicOn = false;
    this.nextStepTime = 0;
    this.stepIndex = 0;
    this.lastSfx = new Map();
  }

  /** Browsers only allow audio after a gesture: call this from a key press or click. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Context();
    } catch {
      this.ctx = null;
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.55;
    this.sfx.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = 0.2;
    this.music.connect(this.master);

    const length = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

    this.startSwingBed();
    this.startMusic();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    return this.muted;
  }

  /** One oscillator note with a quick attack and exponential release. */
  tone({ type = 'sine', freq = 440, freqEnd = null, dur = 0.15, vol = 0.3, attack = 0.005, delay = 0, bus = null }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(bus || this.sfx);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  /** A filtered noise burst: splashes, thuds and whooshes. */
  burst({ dur = 0.2, vol = 0.3, filter = 'lowpass', freq = 800, freqEnd = null, q = 0.8, delay = 0, bus = null }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.Q.value = q;
    biquad.frequency.setValueAtTime(freq, start);
    if (freqEnd) biquad.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(bus || this.sfx);
    source.start(start);
    source.stop(start + dur + 0.05);
  }

  /** Named sound effects (see sfx.js). */
  play(name, arg = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const last = this.lastSfx.get(name) ?? -1;
    if (now - last < 0.035) return;
    this.lastSfx.set(name, now);
    playSfx(this, name, arg);
  }

  /** A looping whoosh whose pitch and loudness follow how fast the anchor moves (0..1). */
  startSwingBed() {
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    this.swingFilter = ctx.createBiquadFilter();
    this.swingFilter.type = 'bandpass';
    this.swingFilter.Q.value = 1.4;
    this.swingFilter.frequency.value = 300;
    this.swingGain = ctx.createGain();
    this.swingGain.gain.value = 0;
    source.connect(this.swingFilter);
    this.swingFilter.connect(this.swingGain);
    this.swingGain.connect(this.sfx);
    source.start();
  }

  setSwing(level) {
    if (!this.ctx || !this.swingGain) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, level));
    this.swingGain.gain.setTargetAtTime(this.muted ? 0 : Math.pow(clamped, 1.6) * 0.55, now, 0.05);
    this.swingFilter.frequency.setTargetAtTime(260 + clamped * 1500, now, 0.05);
  }

  /** 0 (calm) to 1 (boss): the shanty gets faster and busier. */
  setIntensity(level) {
    this.intensity = Math.max(0, Math.min(1, level));
  }

  startMusic() {
    startMusic(this);
  }
}

export const audio = new AudioEngine();
