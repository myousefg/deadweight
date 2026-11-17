// The sound effects, by name. Each one is a few oscillator notes and filtered noise bursts played
// through the engine, so the game ships no audio files. `arg` carries a tier, combo count or similar.

/** Play the effect called `name` on `engine` (an AudioEngine that is already unlocked). */
export function playSfx(engine, name, arg = 0) {
  switch (name) {
    case 'hit': {
      const tier = Math.max(1, arg);
      engine.burst({ dur: 0.12 + tier * 0.04, vol: 0.35, freq: 1800, freqEnd: 200, filter: 'lowpass' });
      engine.tone({ type: 'triangle', freq: 190 - tier * 25, freqEnd: 60, dur: 0.16, vol: 0.4 + tier * 0.08 });
      break;
    }
    case 'kill': {
      const base = 520 + Math.min(arg, 14) * 38;
      engine.tone({ type: 'square', freq: base, freqEnd: base * 1.6, dur: 0.09, vol: 0.12 });
      engine.tone({ type: 'sine', freq: base * 2, dur: 0.14, vol: 0.12, delay: 0.04 });
      break;
    }
    case 'slamStart':
      engine.burst({ dur: 0.18, vol: 0.25, filter: 'bandpass', freq: 400, freqEnd: 2400, q: 1.2 });
      break;
    case 'slam':
      engine.tone({ type: 'sine', freq: 130, freqEnd: 38, dur: 0.5, vol: 0.7 });
      engine.burst({ dur: 0.35, vol: 0.5, freq: 1400, freqEnd: 120 });
      break;
    case 'pearl':
      engine.tone({ type: 'sine', freq: 880, dur: 0.1, vol: 0.18 });
      engine.tone({ type: 'sine', freq: 1320, dur: 0.16, vol: 0.18, delay: 0.06 });
      break;
    case 'heal':
      [523, 659, 784, 1047].forEach((freq, index) => engine.tone({ type: 'triangle', freq, dur: 0.18, vol: 0.2, delay: index * 0.07 }));
      break;
    case 'hurt':
      engine.tone({ type: 'sawtooth', freq: 330, freqEnd: 70, dur: 0.4, vol: 0.4 });
      engine.burst({ dur: 0.3, vol: 0.4, freq: 900, freqEnd: 100 });
      break;
    case 'dash':
      engine.burst({ dur: 0.22, vol: 0.28, filter: 'bandpass', freq: 600, freqEnd: 2600, q: 0.9 });
      break;
    case 'surge':
      engine.tone({ type: 'sine', freq: 90, freqEnd: 420, dur: 0.6, vol: 0.55 });
      engine.burst({ dur: 0.7, vol: 0.5, filter: 'lowpass', freq: 400, freqEnd: 3200 });
      break;
    case 'surgeReady':
      engine.tone({ type: 'triangle', freq: 660, dur: 0.12, vol: 0.22 });
      engine.tone({ type: 'triangle', freq: 990, dur: 0.22, vol: 0.22, delay: 0.1 });
      break;
    case 'click':
      engine.tone({ type: 'triangle', freq: 520, freqEnd: 780, dur: 0.07, vol: 0.2 });
      break;
    case 'select':
      engine.tone({ type: 'triangle', freq: 392, dur: 0.1, vol: 0.25 });
      engine.tone({ type: 'triangle', freq: 587, dur: 0.12, vol: 0.25, delay: 0.08 });
      engine.tone({ type: 'triangle', freq: 784, dur: 0.22, vol: 0.25, delay: 0.16 });
      break;
    case 'deny':
      engine.tone({ type: 'square', freq: 160, dur: 0.14, vol: 0.18 });
      break;
    case 'wave':
      engine.tone({ type: 'sawtooth', freq: 196, dur: 0.5, vol: 0.2, attack: 0.05 });
      engine.tone({ type: 'sawtooth', freq: 294, dur: 0.6, vol: 0.2, attack: 0.05, delay: 0.25 });
      break;
    case 'clear':
      [392, 494, 587, 784].forEach((freq, index) => engine.tone({ type: 'triangle', freq, dur: 0.22, vol: 0.25, delay: index * 0.1 }));
      break;
    case 'reflect':
      engine.tone({ type: 'square', freq: 900, freqEnd: 1500, dur: 0.1, vol: 0.14 });
      break;
    case 'spit':
      engine.burst({ dur: 0.12, vol: 0.2, filter: 'highpass', freq: 1800, q: 0.7 });
      break;
    case 'warn':
      engine.tone({ type: 'square', freq: 740, dur: 0.07, vol: 0.12 });
      break;
    case 'roar':
      engine.tone({ type: 'sawtooth', freq: 70, freqEnd: 45, dur: 1.1, vol: 0.55, attack: 0.08 });
      engine.tone({ type: 'sawtooth', freq: 73, freqEnd: 40, dur: 1.1, vol: 0.4, attack: 0.08 });
      engine.burst({ dur: 1.0, vol: 0.4, filter: 'lowpass', freq: 500, freqEnd: 80 });
      break;
    case 'tentacle':
      engine.burst({ dur: 0.35, vol: 0.5, filter: 'lowpass', freq: 1000, freqEnd: 60 });
      engine.tone({ type: 'sine', freq: 90, freqEnd: 40, dur: 0.35, vol: 0.5 });
      break;
    case 'bolt':
      engine.burst({ dur: 0.3, vol: 0.55, filter: 'highpass', freq: 3000, freqEnd: 800, q: 0.6 });
      engine.tone({ type: 'sawtooth', freq: 140, freqEnd: 40, dur: 0.4, vol: 0.4 });
      break;
    case 'stomp':
      engine.tone({ type: 'sine', freq: 95, freqEnd: 30, dur: 0.6, vol: 0.75 });
      engine.burst({ dur: 0.45, vol: 0.5, freq: 900, freqEnd: 90 });
      break;
    case 'cannon':
      engine.burst({ dur: 0.35, vol: 0.5, filter: 'lowpass', freq: 1400, freqEnd: 90 });
      engine.tone({ type: 'sine', freq: 130, freqEnd: 45, dur: 0.35, vol: 0.5 });
      break;
    case 'boom':
      engine.burst({ dur: 0.7, vol: 0.7, filter: 'lowpass', freq: 2200, freqEnd: 60 });
      engine.tone({ type: 'sine', freq: 110, freqEnd: 28, dur: 0.7, vol: 0.8 });
      engine.tone({ type: 'sawtooth', freq: 200, freqEnd: 50, dur: 0.3, vol: 0.25 });
      break;
    case 'medal':
      [784, 988, 1175, 1568].forEach((freq, index) => engine.tone({ type: 'triangle', freq, dur: 0.28, vol: 0.26, delay: index * 0.07 }));
      break;
    case 'unlock':
      [523, 659, 784, 988, 1175].forEach((freq, index) => engine.tone({ type: 'triangle', freq, dur: 0.3, vol: 0.28, delay: index * 0.09 }));
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((freq, index) => engine.tone({ type: 'triangle', freq, dur: 0.5, vol: 0.28, delay: index * 0.14 }));
      break;
    case 'lose':
      [392, 349, 311, 262].forEach((freq, index) => engine.tone({ type: 'triangle', freq, dur: 0.6, vol: 0.28, delay: index * 0.22 }));
      break;
    default:
      break;
  }
}
