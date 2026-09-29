import { COURT } from './scene.js';

const rand = (a, b) => a + Math.random() * (b - a);
const L = COURT.halfLength;

// Where each of the player's shots lands and how fast it flies (lower flight = faster, flatter).
export const SHOTS = {
  forehand: {
    label: 'FOREHAND!',
    target: (power) => ({ x: rand(-3.6, -1), z: -L * rand(0.65, 0.9), flight: 1.25 - power * 0.45 }),
  },
  backhand: {
    label: 'BACKHAND!',
    target: (power) => ({ x: rand(1, 3.6), z: -L * rand(0.5, 0.75), flight: 1.5 - power * 0.3 }),
  },
  serve: { // In a rally an overhead swing is a smash.
    label: 'SMASH!',
    target: () => ({ x: rand(-3.5, 3.5), z: -L * rand(0.55, 0.85), flight: 0.6 }),
  },
};

export function serveTarget(shot, power) {
  // Overhead motion = a real serve; any other swing = gentle underarm serve.
  return shot === 'serve'
    ? { label: 'SERVE!', x: rand(-3, 3), z: -5, flight: 0.85 - power * 0.2 }
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
