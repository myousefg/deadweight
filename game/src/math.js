// Small numeric helpers shared by every module.

export const TAU = Math.PI * 2;

export const clamp = (value, low, high) => (value < low ? low : value > high ? high : value);
export const lerp = (from, to, amount) => from + (to - from) * amount;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/** Frame-rate independent exponential smoothing: move `from` toward `to` at `rate` per second. */
export const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDiff(from, to) {
  let diff = (to - from) % TAU;
  if (diff > Math.PI) diff -= TAU;
  if (diff <= -Math.PI) diff += TAU;
  return diff;
}

/** Turn `angle` toward `target` by at most `maxStep` radians. */
export function turnToward(angle, target, maxStep) {
  const diff = angleDiff(angle, target);
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

/** Move a number toward a target by at most `step`. */
export function approach(value, target, step) {
  if (value < target) return Math.min(target, value + step);
  return Math.max(target, value - step);
}

/** Format a score with thousands separators. */
export function formatScore(value) {
  return Math.round(value).toLocaleString('en-US');
}

/** Format seconds as m:ss. */
export function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}
