import { COURT } from './scene.js';

const rand = (a, b) => a + Math.random() * (b - a);
const L = COURT.halfLength;

// Where each of the player's shots lands and how fast it flies (lower flight = faster, flatter).
// Power (0.1–1, from how hard you swing) controls both speed and depth:
// a gentle swing is a slow, short ball; a hard swing is a fast, deep one.
const depth = (power, min, max) => -L * (min + (max - min) * power + rand(-0.05, 0.05));
export const SHOTS = {
  forehand: {
    label: 'FOREHAND!',
    target: (power) => ({ x: rand(-3.6, -1), z: depth(power, 0.45, 0.92), flight: 1.75 - power * 1.0 }),
  },
  backhand: {
    label: 'BACKHAND!',
    target: (power) => ({ x: rand(1, 3.6), z: depth(power, 0.4, 0.85), flight: 1.85 - power * 0.95 }),
  },
  serve: { // In a rally an overhead swing is a smash.
    label: 'SMASH!',
    target: (power) => ({ x: rand(-3.5, 3.5), z: depth(power, 0.5, 0.88), flight: 1.0 - power * 0.45 }),
  },
};

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
