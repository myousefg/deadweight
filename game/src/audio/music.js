// The music: a quiet generative sea shanty. A scheduler looks a quarter second ahead and queues
// notes on the engine's music bus; the tempo and the number of voices follow engine.intensity.

const MINOR_PENTATONIC = [0, 3, 5, 7, 10];
const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Start the shanty loop on an unlocked engine. */
export function startMusic(engine) {
  engine.musicOn = true;
  engine.nextStepTime = engine.ctx.currentTime + 0.2;
  engine.stepIndex = 0;
  engine.musicTimer = setInterval(() => scheduleMusic(engine), 80);
}

/** Queue every step that falls inside the next quarter second. */
function scheduleMusic(engine) {
  const { ctx } = engine;
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

/** One eighth note: a bass line, a held chord every bar, then an arpeggio and hats as it gets tense. */
function playMusicStep(engine, step, time) {
  const { ctx } = engine;
  const eighth = step % 32;
  const root = [38, 38, 34, 36][Math.floor(eighth / 8)];
  const voice = (type, midi, dur, vol) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToHz(midi);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(engine.music);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  };
  if (eighth % 2 === 0) voice('triangle', root + (eighth % 8 === 4 ? 7 : 0), 0.4, 0.5);
  if (eighth % 8 === 0) {
    voice('sine', root + 24, 1.8, 0.16);
    voice('sine', root + 27, 1.8, 0.12);
    voice('sine', root + 31, 1.8, 0.12);
  }
  if (engine.intensity > 0.2 && eighth % 2 === 1) {
    const pick = (eighth * 3 + Math.floor(step / 32)) % MINOR_PENTATONIC.length;
    voice('square', root + 36 + MINOR_PENTATONIC[pick], 0.18, 0.05 + engine.intensity * 0.05);
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
