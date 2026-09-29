import * as THREE from 'three';
import { COURT } from './scene.js';

const GRAVITY = -9.8;
const rand = (a, b) => a + Math.random() * (b - a);

// speed: run speed (m/s) · reaction: delay before it starts moving · reach: racket reach
// flight: return shot flight time range (lower = faster) · aim: 0..1 how often it aims away from you
// error: chance of hitting out
export const LEVELS = {
  easy:   { label: 'Easy',   speed: 4,   reaction: 0.35, reach: 1.6, flight: [1.4, 1.7], aim: 0.2, error: 0.12 },
  medium: { label: 'Medium', speed: 5.5, reaction: 0.2,  reach: 1.9, flight: [1.1, 1.4], aim: 0.55, error: 0.06 },
  hard:   { label: 'Hard',   speed: 7.5, reaction: 0.08, reach: 2.3, flight: [0.8, 1.1], aim: 0.85, error: 0.02 },
};
export const LEVEL_ORDER = ['easy', 'medium', 'hard'];

// Simulate the ball forward (same physics as the game) to find where the CPU can hit it:
// after the first bounce on its side, once it comes back down to racket height.
function predictIntercept(pos, vel) {
  const p = pos.clone(), v = vel.clone();
  let bounced = false;
  for (let i = 0; i < 300; i++) {
    v.y += GRAVITY * 0.01;
    p.addScaledVector(v, 0.01);
    if (p.y < 0.12 && v.y < 0) { p.y = 0.12; v.y *= -0.7; v.x *= 0.85; v.z *= 0.85; bounced = true; }
    if ((bounced && v.y < 0 && p.y < 1.2) || p.z < -COURT.halfLength - 3) break;
  }
  return p;
}

export function createCpu(mesh) {
  let level = LEVELS.easy;
  let target = null;
  let reactAt = 0;
  const home = new THREE.Vector3(0, 0, -COURT.halfLength - 1);

  return {
    get level() { return level; },
    setLevel(key) { level = LEVELS[key]; },

    // Call when the player hits: CPU reads the shot after its reaction time.
    onPlayerHit(ball, vel) {
      reactAt = performance.now() + level.reaction * 1000;
      target = predictIntercept(ball.position, vel);
    },
    reset() { target = null; },

    update(dt) {
      const goal = target && performance.now() >= reactAt ? target : home;
      const dest = new THREE.Vector3(
        THREE.MathUtils.clamp(goal.x + 0.5, -COURT.halfWidth - 2, COURT.halfWidth + 2),
        0,
        THREE.MathUtils.clamp(goal.z - 0.3, -COURT.halfLength - 3, -2)
      );
      const d = dest.sub(mesh.position);
      const max = level.speed * dt;
      if (d.length() > max) d.setLength(max);
      mesh.position.add(d);
    },

    canReach(ball) {
      return ball.position.distanceTo(mesh.position.clone().setY(1)) < level.reach;
    },

    // Pick a landing spot on the player's side. Better levels aim away from the player.
    chooseShot(playerX) {
      target = null;
      const W = COURT.halfWidth;
      const side = Math.random() < level.aim ? (playerX > 0 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
      const x = Math.random() < level.error ? side * (W + rand(0.3, 1)) : side * W * rand(0.2, 0.85);
      return { x, z: COURT.halfLength * rand(0.45, 0.9), flight: rand(...level.flight) };
    },
  };
}
