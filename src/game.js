import * as THREE from 'three';
import { connectRelay } from './relay.js';
import { buildCourt, makePlayer, COURT } from './scene.js';
import { SHOTS, serveTarget, poseArm } from './shots.js';
import { unlockAudio, playHit, createImpactFlash } from './effects.js';
import { createCpu, LEVELS, LEVEL_ORDER } from './cpu.js';

// ---------- Remote pairing ----------
const room = Math.random().toString(36).slice(2, 7).toUpperCase();
const remoteUrl = `${location.origin}/remote.html?room=${room}`;
document.getElementById('remote-url').textContent = remoteUrl;
document.getElementById('qr').src =
  `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(remoteUrl)}`;
const remoteStatus = document.getElementById('remote-status');
const sendToRemote = connectRelay(room, 'game', (msg) => {
  if (msg.type === 'swing') swing(msg.shot, msg.power, true);
  if (msg.type === 'remote-connected') remoteStatus.textContent = 'Phone: connected ✓';
  if (msg.type === 'remote-disconnected') remoteStatus.textContent = 'Phone: not connected';
});

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ecdf5);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
buildCourt(scene);
const impact = createImpactFlash(scene);

const player = makePlayer(0x2a8cff);
player.position.set(0, 0, COURT.halfLength + 1);
const cpu = makePlayer(0xff5a5a);
cpu.position.set(0, 0, -COURT.halfLength - 1);
cpu.rotation.y = Math.PI;
scene.add(player, cpu);
const ai = createCpu(cpu);

// ---------- Difficulty ----------
const POINTS_TO_LEVEL_UP = 5;
let levelIndex = 0;
let pointsAtLevel = 0;
const levelButtons = document.getElementById('difficulty');
function setLevel(i) {
  levelIndex = i;
  pointsAtLevel = 0;
  ai.setLevel(LEVEL_ORDER[i]);
  for (const b of levelButtons.querySelectorAll('button')) b.classList.toggle('active', b.dataset.level === LEVEL_ORDER[i]);
}
for (const key of LEVEL_ORDER) {
  const b = document.createElement('button');
  b.textContent = LEVELS[key].label;
  b.dataset.level = key;
  b.onclick = () => setLevel(LEVEL_ORDER.indexOf(key));
  levelButtons.appendChild(b);
}
setLevel(0);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xd8ff3a })
);
ball.castShadow = true;
scene.add(ball);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- Game state ----------
const GRAVITY = -9.8;
const SWING_BUFFER_MS = 350; // a swing slightly before the ball arrives still connects
const REACH = 2.6;
const vel = new THREE.Vector3();
let state = 'serve'; // serve | rally | point
let lastHitter = null;
let bounces = 0;
let score = { you: 0, cpu: 0 };
let swingAnim = { shot: null, time: -1 };
let pending = null; // { shot, power, time, fromRemote }
let hitStopUntil = 0;
let shake = 0;
const msgEl = document.getElementById('message');
const scoreEl = document.getElementById('score');

function showMessage(text, ms) {
  msgEl.textContent = text;
  if (ms) setTimeout(() => msgEl.textContent === text && (msgEl.textContent = ''), ms);
}

function resetForServe() {
  state = 'serve';
  bounces = 0;
  lastHitter = null;
  pending = null;
  vel.set(0, 0, 0);
  showMessage('Swing overhead to serve!');
}

// Launch ball from its current position to land at (tx, tz) with a given flight time.
function hitTo(tx, tz, flight) {
  const p = ball.position;
  vel.set((tx - p.x) / flight, 0.5 * -GRAVITY * flight - p.y / flight, (tz - p.z) / flight);
}

function onPlayerContact(label, power, fromRemote) {
  lastHitter = 'you';
  bounces = 0;
  ai.onPlayerHit(ball, vel);
  impact.trigger(ball.position);
  playHit(power);
  hitStopUntil = performance.now() + 60;
  shake = 0.15 * power;
  showMessage(label, 700);
  if (fromRemote) sendToRemote({ type: 'hit' });
}

function swing(shot, power = 0.7, fromRemote = false) {
  if (!SHOTS[shot]) shot = ball.position.x >= player.position.x ? 'forehand' : 'backhand';
  swingAnim = { shot, time: performance.now() };
  if (state === 'serve') {
    const s = serveTarget(shot, power);
    state = 'rally';
    ball.position.y = shot === 'serve' ? 2.5 : 0.9;
    hitTo(s.x, s.z, s.flight);
    onPlayerContact(s.label, power, fromRemote);
    return;
  }
  if (state === 'rally' && lastHitter === 'cpu') pending = { shot, power, time: performance.now(), fromRemote };
}

function tryPendingHit() {
  if (!pending) return;
  if (performance.now() - pending.time > SWING_BUFFER_MS) {
    if (pending.fromRemote) sendToRemote({ type: 'miss' });
    pending = null;
    return;
  }
  const d = ball.position.distanceTo(player.position.clone().setY(1));
  if (d < REACH && ball.position.z > 0) {
    const { shot, power, fromRemote } = pending;
    pending = null;
    const t = SHOTS[shot].target(power);
    hitTo(t.x, t.z, t.flight);
    onPlayerContact(SHOTS[shot].label, power, fromRemote);
  }
}

const KEYS = { KeyD: 'forehand', ArrowRight: 'forehand', KeyA: 'backhand', ArrowLeft: 'backhand', KeyW: 'serve', ArrowUp: 'serve', Space: 'auto' };
addEventListener('keydown', (e) => { if (KEYS[e.code]) { unlockAudio(); swing(KEYS[e.code]); } });
addEventListener('pointerdown', (e) => { unlockAudio(); if (!e.target.closest('#pair, #difficulty')) swing('auto'); });

function cpuHit() {
  lastHitter = 'cpu';
  bounces = 0;
  playHit(0.5);
  cpuSwingTime = performance.now();
  const t = ai.chooseShot(player.position.x);
  hitTo(t.x, t.z, t.flight);
}
let cpuSwingTime = -1;

function awardPoint(winner, why) {
  state = 'point';
  pending = null;
  ai.reset();
  score[winner]++;
  scoreEl.textContent = `You ${score.you} – ${score.cpu} CPU`;
  let text = `${winner === 'you' ? 'Your' : 'CPU'} point! ${why}`;
  // Opponent gets tougher as you keep winning points.
  if (winner === 'you' && ++pointsAtLevel >= POINTS_TO_LEVEL_UP && levelIndex < LEVEL_ORDER.length - 1) {
    setLevel(levelIndex + 1);
    text += ` Level up: ${ai.level.label}!`;
  }
  showMessage(text);
  setTimeout(resetForServe, 1500);
}

// ---------- Loop ----------
const clock = new THREE.Clock();
resetForServe();

function step(dt) {
  if (state === 'serve') {
    ball.position.set(player.position.x + 0.5, 1.2 + Math.sin(performance.now() / 200) * 0.1, player.position.z - 0.3);
    return;
  }
  if (performance.now() < hitStopUntil) return;

  vel.y += GRAVITY * dt;
  ball.position.addScaledVector(vel, dt);
  if (state === 'rally') tryPendingHit();

  // Bounce
  if (ball.position.y < 0.12 && vel.y < 0) {
    ball.position.y = 0.12;
    vel.y *= -0.7;
    vel.x *= 0.85; vel.z *= 0.85;
    if (state === 'rally') {
      bounces++;
      const inX = Math.abs(ball.position.x) <= COURT.halfWidth;
      const onYourSide = ball.position.z > 0;
      const inZ = Math.abs(ball.position.z) <= COURT.halfLength;
      const correctSide = lastHitter === 'you' ? !onYourSide : onYourSide;
      if (bounces === 1 && !(inX && inZ && correctSide)) {
        awardPoint(lastHitter === 'you' ? 'cpu' : 'you', 'Out!');
      } else if (bounces >= 2) {
        awardPoint(lastHitter, 'Winner!');
      }
    }
  }

  // Net
  if (state === 'rally' && Math.abs(ball.position.z) < 0.1 && ball.position.y < COURT.netHeight) {
    awardPoint(lastHitter === 'you' ? 'cpu' : 'you', 'Into the net!');
    vel.set(0, 0, 0);
  }

  // CPU returns the ball
  if (state === 'rally' && lastHitter === 'you' && bounces === 1 && ai.canReach(ball)) cpuHit();
}

function movePlayers(dt) {
  // Wii Tennis style: players move automatically toward the ball's line.
  const follow = (p, targetX, speed) => {
    p.position.x += THREE.MathUtils.clamp(targetX - p.position.x, -speed * dt, speed * dt);
  };
  if (state === 'rally') {
    if (lastHitter === 'cpu') follow(player, ball.position.x + vel.x * 0.4 - 0.6, 7);
  }
  ai.update(dt);
  const ct = (performance.now() - cpuSwingTime) / 250;
  cpu.userData.arm.rotation.z = ct >= 0 && ct < 1 ? -Math.sin(ct * Math.PI) * 2 : 0;
  poseArm(player.userData.arm, swingAnim.shot, (performance.now() - swingAnim.time) / 280);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  step(dt);
  movePlayers(dt);
  impact.update();
  shake *= 0.85;
  camera.position.set(player.position.x * 0.5 + (Math.random() - 0.5) * shake, 5 + (Math.random() - 0.5) * shake, COURT.halfLength + 8);
  camera.lookAt(0, 0, -2);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
