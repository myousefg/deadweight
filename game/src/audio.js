// Sound, all synthesised with the Web Audio API: no audio files. Effects are short oscillator and
// noise bursts; a quiet generative sea shanty loop plays underneath and speeds up with the waves.

const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

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

  /** Named sound effects. `arg` carries a tier, combo count or similar. */
  play(name, arg = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const last = this.lastSfx.get(name) ?? -1;
    if (now - last < 0.035) return;
    this.lastSfx.set(name, now);
    switch (name) {
      case 'hit': {
        const tier = Math.max(1, arg);
        this.burst({ dur: 0.12 + tier * 0.04, vol: 0.35, freq: 1800, freqEnd: 200, filter: 'lowpass' });
        this.tone({ type: 'triangle', freq: 190 - tier * 25, freqEnd: 60, dur: 0.16, vol: 0.4 + tier * 0.08 });
        break;
      }
      case 'kill': {
        const base = 520 + Math.min(arg, 14) * 38;
        this.tone({ type: 'square', freq: base, freqEnd: base * 1.6, dur: 0.09, vol: 0.12 });
        this.tone({ type: 'sine', freq: base * 2, dur: 0.14, vol: 0.12, delay: 0.04 });
        break;
      }
      case 'slamStart':
        this.burst({ dur: 0.18, vol: 0.25, filter: 'bandpass', freq: 400, freqEnd: 2400, q: 1.2 });
        break;
      case 'slam':
        this.tone({ type: 'sine', freq: 130, freqEnd: 38, dur: 0.5, vol: 0.7 });
        this.burst({ dur: 0.35, vol: 0.5, freq: 1400, freqEnd: 120 });
        break;
      case 'pearl':
        this.tone({ type: 'sine', freq: 880, dur: 0.1, vol: 0.18 });
        this.tone({ type: 'sine', freq: 1320, dur: 0.16, vol: 0.18, delay: 0.06 });
        break;
      case 'heal':
        [523, 659, 784, 1047].forEach((freq, index) => this.tone({ type: 'triangle', freq, dur: 0.18, vol: 0.2, delay: index * 0.07 }));
        break;
      case 'hurt':
        this.tone({ type: 'sawtooth', freq: 330, freqEnd: 70, dur: 0.4, vol: 0.4 });
        this.burst({ dur: 0.3, vol: 0.4, freq: 900, freqEnd: 100 });
        break;
      case 'dash':
        this.burst({ dur: 0.22, vol: 0.28, filter: 'bandpass', freq: 600, freqEnd: 2600, q: 0.9 });
        break;
      case 'surge':
        this.tone({ type: 'sine', freq: 90, freqEnd: 420, dur: 0.6, vol: 0.55 });
        this.burst({ dur: 0.7, vol: 0.5, filter: 'lowpass', freq: 400, freqEnd: 3200 });
        break;
      case 'surgeReady':
        this.tone({ type: 'triangle', freq: 660, dur: 0.12, vol: 0.22 });
        this.tone({ type: 'triangle', freq: 990, dur: 0.22, vol: 0.22, delay: 0.1 });
        break;
      case 'click':
        this.tone({ type: 'triangle', freq: 520, freqEnd: 780, dur: 0.07, vol: 0.2 });
        break;
      case 'select':
        this.tone({ type: 'triangle', freq: 392, dur: 0.1, vol: 0.25 });
        this.tone({ type: 'triangle', freq: 587, dur: 0.12, vol: 0.25, delay: 0.08 });
        this.tone({ type: 'triangle', freq: 784, dur: 0.22, vol: 0.25, delay: 0.16 });
        break;
      case 'deny':
        this.tone({ type: 'square', freq: 160, dur: 0.14, vol: 0.18 });
        break;
      case 'wave':
        this.tone({ type: 'sawtooth', freq: 196, dur: 0.5, vol: 0.2, attack: 0.05 });
        this.tone({ type: 'sawtooth', freq: 294, dur: 0.6, vol: 0.2, attack: 0.05, delay: 0.25 });
        break;
      case 'clear':
        [392, 494, 587, 784].forEach((freq, index) => this.tone({ type: 'triangle', freq, dur: 0.22, vol: 0.25, delay: index * 0.1 }));
        break;
      case 'reflect':
        this.tone({ type: 'square', freq: 900, freqEnd: 1500, dur: 0.1, vol: 0.14 });
        break;
      case 'spit':
        this.burst({ dur: 0.12, vol: 0.2, filter: 'highpass', freq: 1800, q: 0.7 });
        break;
      case 'warn':
        this.tone({ type: 'square', freq: 740, dur: 0.07, vol: 0.12 });
        break;
      case 'roar':
        this.tone({ type: 'sawtooth', freq: 70, freqEnd: 45, dur: 1.1, vol: 0.55, attack: 0.08 });
        this.tone({ type: 'sawtooth', freq: 73, freqEnd: 40, dur: 1.1, vol: 0.4, attack: 0.08 });
        this.burst({ dur: 1.0, vol: 0.4, filter: 'lowpass', freq: 500, freqEnd: 80 });
        break;
      case 'tentacle':
        this.burst({ dur: 0.35, vol: 0.5, filter: 'lowpass', freq: 1000, freqEnd: 60 });
        this.tone({ type: 'sine', freq: 90, freqEnd: 40, dur: 0.35, vol: 0.5 });
        break;
      case 'bolt':
        this.burst({ dur: 0.3, vol: 0.55, filter: 'highpass', freq: 3000, freqEnd: 800, q: 0.6 });
        this.tone({ type: 'sawtooth', freq: 140, freqEnd: 40, dur: 0.4, vol: 0.4 });
        break;
      case 'stomp':
        this.tone({ type: 'sine', freq: 95, freqEnd: 30, dur: 0.6, vol: 0.75 });
        this.burst({ dur: 0.45, vol: 0.5, freq: 900, freqEnd: 90 });
        break;
      case 'unlock':
        [523, 659, 784, 988, 1175].forEach((freq, index) => this.tone({ type: 'triangle', freq, dur: 0.3, vol: 0.28, delay: index * 0.09 }));
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((freq, index) => this.tone({ type: 'triangle', freq, dur: 0.5, vol: 0.28, delay: index * 0.14 }));
        break;
      case 'lose':
        [392, 349, 311, 262].forEach((freq, index) => this.tone({ type: 'triangle', freq, dur: 0.6, vol: 0.28, delay: index * 0.22 }));
        break;
      default:
        break;
    }
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
    this.musicOn = true;
    this.nextStepTime = this.ctx.currentTime + 0.2;
    this.stepIndex = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 80);
  }

  scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.musicOn) return;
    // After a throttled or hidden tab, skip the missed steps instead of playing them in a burst.
    if (this.nextStepTime < ctx.currentTime - 0.1) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + 0.25) {
      this.playMusicStep(this.stepIndex, this.nextStepTime);
      const bpm = 88 + this.intensity * 34;
      this.nextStepTime += 60 / bpm / 2;
      this.stepIndex += 1;
    }
  }

  playMusicStep(step, time) {
    const ctx = this.ctx;
    const eighth = step % 32;
    const root = [38, 38, 34, 36][Math.floor(eighth / 8)];
    const note = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
    const voice = (type, midi, dur, vol, bus) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = note(midi);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    };
    if (eighth % 2 === 0) voice('triangle', root + (eighth % 8 === 4 ? 7 : 0), 0.4, 0.5, this.music);
    if (eighth % 8 === 0) {
      voice('sine', root + 24, 1.8, 0.16, this.music);
      voice('sine', root + 27, 1.8, 0.12, this.music);
      voice('sine', root + 31, 1.8, 0.12, this.music);
    }
    if (this.intensity > 0.2 && eighth % 2 === 1) {
      const pick = (eighth * 3 + Math.floor(step / 32)) % MINOR_PENTATONIC.length;
      voice('square', root + 36 + MINOR_PENTATONIC[pick], 0.18, 0.05 + this.intensity * 0.05, this.music);
    }
    if (this.intensity > 0.5 && eighth % 4 === 2) {
      const hat = ctx.createBufferSource();
      hat.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      hat.connect(filter);
      filter.connect(gain);
      gain.connect(this.music);
      hat.start(time);
      hat.stop(time + 0.08);
    }
  }
}

export const audio = new AudioEngine();
