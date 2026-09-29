import * as THREE from 'three';
import { connectRelay } from './relay.js';
import { poseArm } from './shots.js';
import { unlockAudio, playHit } from './effects.js';
import { speak } from './scoring.js';
import { createWorld } from './world.js';
import { renderPairing, remoteUrl } from './pairing.js';

const GRAVITY = -9.8;

// Online guest: mirrors the host's match from Player 2's side. The host runs the game;
// this screen only renders the state it receives and forwards its own swings.
export function startGuest(room) {
  const world = createWorld();
  const { ball, players, env, impact } = world;
  const scoreEl = document.getElementById('score');
  const msgEl = document.getElementById('message');
  const panel = document.getElementById('pair');
  document.getElementById('controls').hidden = true;

  let anim = [{ shot: null, time: -1 }, { shot: null, time: -1 }];
  let phoneConnected = false;
  const hint = 'You are Player 2. No phone? D = forehand, A = backhand, W = serve/smash.';
  const updatePanel = () => renderPairing(panel, [{ title: 'Your phone (Player 2)', url: remoteUrl(room, 2), connected: phoneConnected }], null, hint);
  updatePanel();
  msgEl.textContent = 'Connecting to host…';

  const send = connectRelay(room, 'guest', (msg) => {
    if (msg.type === 'state') {
      net = { ball: msg.ball, vel: msg.vel, players: msg.players, time: performance.now() };
      anim = msg.anim.map((a) => ({ shot: a.shot, time: performance.now() - a.age }));
      if (msg.board != null) scoreEl.innerHTML = msg.board;
      if (msg.message != null) msgEl.textContent = msg.message;
    } else if (msg.type === 'pong') {
      rtt = rtt * 0.7 + (performance.now() - msg.t) * 0.3;
    } else if (msg.type === 'fx') {
      if (msg.kind === 'hit') { impact.trigger(new THREE.Vector3(...msg.pos)); playHit(msg.power); }
      if (msg.kind === 'cheer') env.cheer(msg.amount);
      if (msg.kind === 'speak') speak(msg.text);
    } else if (msg.type === 'remote-connected' || msg.type === 'remote-disconnected') {
      if (msg.player === 2) { phoneConnected = msg.type === 'remote-connected'; updatePanel(); }
    } else if (msg.type === 'game-disconnected') {
      msgEl.textContent = 'The host left the match';
    }
  });

  const KEYS = { KeyD: 'forehand', KeyA: 'backhand', KeyW: 'serve', Space: 'auto' };
  const swing = (shot) => { unlockAudio(); send({ type: 'swing', player: 2, shot, power: 0.7 }); };
  addEventListener('keydown', (e) => KEYS[e.code] && swing(KEYS[e.code]));
  addEventListener('pointerdown', (e) => !e.target.closest('#pair, #pair-toggle') && swing('auto'));

  // Smooth online play: extrapolate the ball along its arc from the last update, looking
  // ahead by the network round trip so it's shown where it will be when our swing lands
  // on the host. Then ease toward that point so corrections never look like a jump.
  let net = null;
  let rtt = 80;
  setInterval(() => send({ type: 'ping', t: performance.now() }), 2000);

  function predictBall() {
    const dt = Math.min((performance.now() - net.time + rtt) / 1000, 0.25);
    const [x, y, z] = net.ball, [vx, vy, vz] = net.vel;
    return new THREE.Vector3(x + vx * dt, Math.max(0.12, y + vy * dt + 0.5 * GRAVITY * dt * dt), z + vz * dt);
  }

  function animate() {
    if (net) {
      const target = predictBall();
      // Big jumps (new serve, hit) snap; small drift is eased.
      if (ball.position.distanceTo(target) > 3) ball.position.copy(target);
      else ball.position.lerp(target, 0.5);
      net.players.forEach(([x, z], i) => {
        players[i].position.x += (x - players[i].position.x) * 0.3;
        players[i].position.z = z;
      });
    }
    players.forEach((p, i) => poseArm(p.userData.arm, anim[i].shot, (performance.now() - anim[i].time) / 280));
    world.render(1);
    requestAnimationFrame(animate);
  }
  animate();
}
