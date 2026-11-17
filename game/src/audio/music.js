// The generative sea shanty that plays underneath the game: a bass walk, a drone chord, a pentatonic
// lead and hi-hats that join in as the voyage heats up. It is scheduled a little ahead of the audio
// clock from a timer, and gets faster with the engine's intensity.

const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

/** Start the loop on an unlocked engine. */
export function startMusic(engine) {
  engine.musicOn = true;
  engine.nextStepTime = engine.ctx.currentTime + 0.2;
  engine.stepIndex = 0;
  engine.musicTimer = setInterval(() => scheduleMusic(engine), 80);
}

function scheduleMusic(engine) {
  const ctx = engine.ctx;
  if (!ctx || !engine.musicOn) return;
  // After a throttled or hidden tab, skip the missed steps instead of playing them in a burst.
  if (engine.nextStepTime < ctx.currentTime - 0.1) engine.nextStepTime = ctx.currentTime + 0.05;
  while (engine.nextStepTime < ctx.currentTime + 0.25) {
    playMusicStep(engine, engine.stepIndex, engine.nextStepTime);
    const bpm = 88 + engine.intensity * 34;
    engine.nextStepTime += 60 / bpm / 2;
    engine.stepIndex += 1;
  }
}

function playMusicStep(engine, step, time) {
  const ctx = engine.ctx;
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
  if (eighth % 2 === 0) voice('triangle', root + (eighth % 8 === 4 ? 7 : 0), 0.4, 0.5, engine.music);
  if (eighth % 8 === 0) {
    voice('sine', root + 24, 1.8, 0.16, engine.music);
    voice('sine', root + 27, 1.8, 0.12, engine.music);
    voice('sine', root + 31, 1.8, 0.12, engine.music);
  }
  if (engine.intensity > 0.2 && eighth % 2 === 1) {
    const pick = (eighth * 3 + Math.floor(step / 32)) % MINOR_PENTATONIC.length;
    voice('square', root + 36 + MINOR_PENTATONIC[pick], 0.18, 0.05 + engine.intensity * 0.05, engine.music);
  }
  if (engine.intensity > 0.5 && eighth % 4 === 2) {
    const hat = ctx.createBufferSource();
    hat.buffer = engine.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    hat.connect(filter);
    filter.connect(gain);
    gain.connect(engine.music);
    hat.start(time);
    hat.stop(time + 0.08);
  }
}
