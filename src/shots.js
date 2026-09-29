import { COURT } from './scene.js';

const rand = (a, b) => a + Math.random() * (b - a);
const L = COURT.halfLength;

// Where each of the player's shots lands and how fast it flies (lower flight = faster, flatter).
// Power (0.1–1, from how hard you swing) controls both speed and depth:
// a gentle swing is a slow, short ball; a hard swing is a fast, deep one.
const depth = (power, min, max) => -L * (min + (max - min) * power + rand(-0.05, 0.05));
// aim: -1 = swung early (cross-court) … +1 = swung late (down the line).
// Forehands go cross-court toward -x, backhands toward +x (mirrored for down the line).
const aimX = (aim, crossSide) => Math.max(-3.8, Math.min(3.8, crossSide * (1.2 - aim * 2.4 + rand(-0.4, 0.4))));
export const SHOTS = {
  forehand: {
    label: 'FOREHAND!',
    target: (power, aim = 0) => ({ x: aimX(aim, -1), z: depth(power, 0.45, 0.92), flight: 1.75 - power * 1.0 }),
  },
  backhand: {
    label: 'BACKHAND!',
    target: (power, aim = 0) => ({ x: aimX(aim, 1), z: depth(power, 0.4, 0.85), flight: 1.85 - power * 0.95 }),
  },
  serve: { // In a rally an overhead swing is a smash.
    label: 'SMASH!',
    target: (power) => ({ x: rand(-3.5, 3.5), z: depth(power, 0.5, 0.88), flight: 1.0 - power * 0.45 }),
  },
};

// Spin from the racket's vertical path: up = topspin (safe, deep), down = slice (low, short),
// a soft upward swing = lob (high and deep).
export function applySpin(shot, t, power, spin = 0) {
  if (shot === 'serve') return { ...t, spinLabel: '' };
  if (spin > 0.3 && power < 0.4) return { ...t, z: -L * 0.88, flight: 2.4, spinLabel: 'LOB' };
  if (spin > 0.3) return { ...t, z: t.z * 1.05, flight: t.flight + 0.15, spinLabel: 'TOPSPIN' };
  if (spin < -0.3) return { ...t, z: t.z * 0.8, flight: t.flight + 0.3, spinLabel: 'SLICE' };
  return { ...t, spinLabel: '' };
}

// "POWER FOREHAND!" / "soft forehand" so the player sees their swing strength.
export function shotLabel(label, power) {
  if (power >= 0.85) return `POWER ${label}`;
  if (power <= 0.35) return `soft ${label.toLowerCase()}`;
  return label;
}

export function serveTarget(shot, power) {
  // Overhead motion = a real serve; any other swing = gentle underarm serve.
  return shot === 'serve'
    ? { label: shotLabel('SERVE!', power), x: rand(-3, 3), z: -5, flight: 1.15 - power * 0.5 }
    : { label: 'Underarm serve', x: rand(-2, 2), z: -4.5, flight: 1.4 };
}

// Arm pose for a swing, t from 0 (wind-up) to 1 (follow-through).
export function poseArm(arm, shot, t) {
  arm.rotation.set(0, 0, 0);
  arm.position.x = shot === 'backhand' ? -0.4 : 0.4;
  if (shot == null || t < 0 || t > 1) return;
  const e = t * t * (3 - 2 * t);
  if (shot === 'forehand') arm.rotation.y = -1.4 + e * 2.8;
  else if (shot === 'backhand') arm.rotation.y = Math.PI + 1.4 - e * 2.8;
  else arm.rotation.z = 2.4 - e * 2.9;
}
