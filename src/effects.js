import * as THREE from 'three';

// ---------- Sound ----------
let ctx;
export function unlockAudio() {
  ctx ??= new AudioContext();
  ctx.resume();
}

// A short "pock": a quick pitched thump plus a burst of noise.
export function playHit(power = 0.7) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.frequency.setValueAtTime(700 + power * 400, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
  og.gain.setValueAtTime(0.5, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(og).connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.1);

  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const noise = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.3 + power * 0.3;
  noise.buffer = buf;
  noise.connect(ng).connect(ctx.destination);
  noise.start(t);
}

// ---------- Impact flash ----------
export function createImpactFlash(scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0 })
  );
  scene.add(mesh);
  let start = -1;
  return {
    trigger(pos) { mesh.position.copy(pos); start = performance.now(); },
    update() {
      const t = (performance.now() - start) / 180;
      const on = start >= 0 && t < 1;
      mesh.visible = on;
      if (on) { mesh.scale.setScalar(1 + t * 3); mesh.material.opacity = 0.9 * (1 - t); }
    },
  };
}
