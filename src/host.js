import * as THREE from 'three';
import { connectRelay } from './relay.js';
import { COURT } from './scene.js';
import { SHOTS, applySpin, serveTarget, poseArm, shotLabel } from './shots.js';
import { unlockAudio, playHit } from './effects.js';
import { createCpu, LEVELS, LEVEL_ORDER } from './cpu.js';
import { createScore, speak, renderScoreboard } from './scoring.js';
import { createWorld } from './world.js';
import { renderPairing, remoteUrl } from './pairing.js';

const GRAVITY = -9.8;
const SWING_BUFFER_MS = 350; // a swing slightly before the ball arrives still connects
const REACH = 2.6;
const POINTS_TO_LEVEL_UP = 5;
const side = (i) => (i === 0 ? 1 : -1); // player 0 owns z > 0, player 1 owns z < 0
// Shots are defined from player 0's point of view; flip them for player 1.
const mirror = (t, i) => (i === 0 ? t : { ...t, x: -t.x, z: -t.z });

// The host screen runs the whole match: vs CPU, two phones on this screen,
// or against an online guest screen (which joins the same relay room).
export function startHost() {
  const room = Math.random().toString(36).slice(2, 7).toUpperCase();
  const world = createWorld();
  const { ball, players, env, impact } = world;
  const ai = createCpu(players[1]);
  const scoreEl = document.getElementById('score');
  const msgEl = document.getElementById('message');
  const panel = document.getElementById('pair');

  let mode = 'cpu'; // cpu | versus
  let online = false;
  const phones = { 1: false, 2: false };
  const remotes = { 1: null, 2: null }; // last status each phone reported: { motion, calibrated }
  const alertEl = document.getElementById('alert');

  const send = connectRelay(room, 'game', (msg) => {
    if (msg.type === 'swing') swing((msg.player || 1) - 1, msg.shot, msg.power, true, msg.spin);
    if (msg.type === 'remote-connected' || msg.type === 'remote-disconnected') {
      const p = msg.player || 1;
      phones[p] = msg.type === 'remote-connected';
      if (phones[p]) remotes[p] ||= { motion: false, calibrated: false };
      if (p === 2 && phones[2] && mode === 'cpu') setMode('versus');
      updatePanel();
    }
    if (msg.type === 'remote-status') { remotes[msg.player] = { motion: msg.motion, calibrated: msg.calibrated }; updateAlert(); }
    if (msg.type === 'ping') send({ type: 'pong', t: msg.t });
    if (msg.type === 'guest-connected') { online = true; sentBoard = sentMessage = sentAlert = null; setMode('versus'); }
    if (msg.type === 'guest-disconnected') { online = false; updatePanel(); updateModeButtons(); }
  }, (ok) => ok && send({ type: 'status-request' }));

  // In 2-player games, warn when a phone that was paired drops out or isn't ready yet.
  function updateAlert() {
    const lines = [];
    if (mode === 'versus') {
      for (const p of [1, 2]) {
        const r = remotes[p];
        if (!r) continue; // never paired a phone (keyboard play)
        if (!phones[p]) lines.push(`⚠️ Player ${p} remote disconnected`);
        else if (!r.motion) lines.push(`📱 Player ${p}: tap "enable motion" on the phone`);
        else if (!r.calibrated) lines.push(`🎯 Player ${p} remote needs calibration`);
      }
    }
    alertEl.innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
    alertEl.hidden = !lines.length;
  }

  // ---------- Effects (also mirrored to the online guest) ----------
  const fx = {
    hit(power) {
      impact.trigger(ball.position);
      playHit(power);
      if (online) send({ type: 'fx', kind: 'hit', power, pos: ball.position.toArray() });
    },
    cheer(amount) { env.cheer(amount); if (online) send({ type: 'fx', kind: 'cheer', amount }); },
    speak(text) { speak(text); if (online) send({ type: 'fx', kind: 'speak', text }); },
  };

  // ---------- Pairing panel ----------
  function updatePanel() {
    updateAlert();
    const cards = [{ title: mode === 'cpu' ? 'Your phone' : 'Player 1 phone', url: remoteUrl(room, 1), connected: phones[1] }];
    if (mode === 'versus' && !online) cards.push({ title: 'Player 2 phone', url: remoteUrl(room, 2), connected: phones[2] });
    const hint = mode === 'versus' && !online
      ? 'No phones? P1: D / A / W · P2: L / J / I (forehand / backhand / serve).'
      : 'No phone? D = forehand, A = backhand, W = serve/smash (SPACE or click picks for you).';
    renderPairing(panel, cards, online ? { connected: true } : { inviteUrl: `${location.origin}/?join=${room}` }, hint);
  }

  // ---------- Mode + difficulty ----------
  const modeButtons = document.getElementById('mode');
  const levelButtons = document.getElementById('difficulty');
  let levelIndex = 0;
  let pointsAtLevel = 0;

  function updateModeButtons() {
    for (const b of modeButtons.querySelectorAll('button')) {
      b.classList.toggle('active', b.dataset.mode === mode);
      b.disabled = online && b.dataset.mode === 'cpu';
    }
    levelButtons.hidden = mode !== 'cpu';
  }
  function setMode(m) {
    mode = m;
    score.setNames(m === 'cpu' ? ['You', 'CPU'] : ['Player 1', 'Player 2']);
    score.resetSet();
    ai.reset();
    renderScoreboard(scoreEl, score);
    updateModeButtons();
    updatePanel();
    resetForServe();
  }
  for (const [key, label] of [['cpu', 'vs CPU'], ['versus', '2 Players']]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.mode = key;
    b.onclick = () => setMode(key);
    modeButtons.appendChild(b);
  }

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

  // ---------- Game state ----------
  const vel = new THREE.Vector3();
  const score = createScore();
  let state = 'serve'; // serve | rally | point
  let server = 0;
  let serveId = 0;
  let tossed = false; // server has thrown the ball up and must swing as it drops
  let faults = 0; // like tennis: two tries, then the opponent gets the point
  let lastHitter = null; // 0 | 1
  let bounces = 0;
  const anim = [{ shot: null, time: -1 }, { shot: null, time: -1 }];
  const pending = [null, null]; // buffered swings: { shot, power, time, fromRemote }
  let hitStopUntil = 0;
  let shake = 0;

  function showMessage(text, ms) {
    msgEl.textContent = text;
    if (ms) setTimeout(() => msgEl.textContent === text && (msgEl.textContent = ''), ms);
  }

  function resetForServe() {
    state = 'serve';
    server = score.totalGames % 2; // serve alternates each game
    tossed = false;
    faults = 0;
    bounces = 0;
    lastHitter = null;
    pending[0] = pending[1] = null;
    vel.set(0, 0, 0);
    const id = ++serveId;
    if (mode === 'cpu' && server === 1) {
      showMessage('CPU serving…');
      cpuServe(id);
    } else {
      const who = mode === 'cpu' ? '' : `${score.names[server]}: `;
      showMessage(`${who}Swing to toss the ball up, then swing again as it drops!`);
    }
  }

  // CPU tosses, then swings as the ball drops — or occasionally misses it (fault).
  function cpuServe(id) {
    const alive = () => id === serveId && state === 'serve';
    setTimeout(() => {
      if (!alive()) return;
      toss(1);
      if (Math.random() < ai.level.serveSuccess) setTimeout(() => alive() && tossed && serve(1, 'serve', 0.6, false), 1000);
    }, 1200);
  }

  function toss(i) {
    tossed = true;
    anim[i] = { shot: 'toss', time: performance.now() };
    vel.set(0, 7.5, 0); // high toss: ~1.5s in the air
    if (!(mode === 'cpu' && i === 1)) showMessage(`${mode === 'cpu' ? '' : `${score.names[i]}: `}Now swing!`, 900);
  }

  // Missed the tossed ball: first time is a fault, second is a double fault.
  function fault() {
    tossed = false;
    vel.set(0, 0, 0);
    if (++faults >= 2) return awardPoint(1 - server, 'Double fault!');
    fx.speak('Fault');
    showMessage('Fault! Second serve — toss again.');
    if (mode === 'cpu' && server === 1) cpuServe(serveId);
  }

  // Launch ball from its current position to land at (tx, tz) with a given flight time.
  // If that arc would hit the net, slow the shot down (higher arc) until it clears.
  function hitTo(tx, tz, flight) {
    const p = ball.position;
    const clearsNet = (f) => {
      if (Math.sign(p.z) === Math.sign(tz)) return true;
      const t = (p.z / (p.z - tz)) * f; // time when the ball crosses z = 0
      const vy = 0.5 * -GRAVITY * f - p.y / f;
      return p.y + vy * t + 0.5 * GRAVITY * t * t > COURT.netHeight + 0.25;
    };
    while (!clearsNet(flight) && flight < 3) flight += 0.05;
    vel.set((tx - p.x) / flight, 0.5 * -GRAVITY * flight - p.y / flight, (tz - p.z) / flight);
  }

  function contact(i, label, power, fromRemote) {
    lastHitter = i;
    bounces = 0;
    if (mode === 'cpu' && i === 0) ai.onPlayerHit(ball, vel);
    fx.hit(power);
    hitStopUntil = performance.now() + 60;
    shake = 0.15 * power;
    if (label) showMessage(mode === 'cpu' ? label : `${score.names[i]}: ${label}`, 700);
    if (fromRemote) send({ type: 'hit', player: i + 1 });
  }

  function serve(i, shot, power, fromRemote) {
    const s = mirror(serveTarget(shot, power), i);
    anim[i] = { shot, time: performance.now() };
    state = 'rally';
    if (!tossed) ball.position.y = shot === 'serve' ? 2.5 : 0.9;
    tossed = false;
    hitTo(s.x, s.z, s.flight);
    contact(i, s.label, power, fromRemote);
  }

  function swing(i, shot, power = 0.7, fromRemote = false, spin = 0) {
    if (mode === 'cpu' && i === 1) return;
    const p = players[i];
    if (!SHOTS[shot]) shot = (ball.position.x - p.position.x) * side(i) >= 0 ? 'forehand' : 'backhand';
    if (state === 'serve') {
      if (server !== i) return;
      if (!tossed) toss(i);
      else if (ball.position.y > 1.3) serve(i, shot, power, fromRemote); // generous window
      else fault();
      return;
    }
    anim[i] = { shot, time: performance.now() };
    if (state === 'rally' && lastHitter === 1 - i) pending[i] = { shot, power, spin, time: performance.now(), fromRemote };
  }

  function tryPendingHit(i) {
    const pend = pending[i];
    if (!pend) return;
    if (performance.now() - pend.time > SWING_BUFFER_MS) {
      if (pend.fromRemote) send({ type: 'miss', player: i + 1 });
      pending[i] = null;
      return;
    }
    const d = ball.position.distanceTo(players[i].position.clone().setY(1));
    if (d < REACH && Math.sign(ball.position.z) === side(i)) {
      pending[i] = null;
      // Timing: swung long before contact = early (cross-court), right at contact = late (down the line).
      const aim = 1 - 2 * Math.min(1, (performance.now() - pend.time) / SWING_BUFFER_MS);
      const s = applySpin(pend.shot, SHOTS[pend.shot].target(pend.power, aim), pend.power, pend.spin);
      const t = mirror(s, i);
      hitTo(t.x, t.z, t.flight);
      const label = shotLabel(SHOTS[pend.shot].label, pend.power);
      contact(i, s.spinLabel ? `${s.spinLabel} ${label}` : label, pend.power, pend.fromRemote);
    }
  }

  function cpuHit() {
    anim[1] = { shot: 'forehand', time: performance.now() };
    const t = ai.chooseShot(players[0].position.x);
    hitTo(t.x, t.z, t.flight);
    contact(1, '', 0.5, false);
  }

  function awardPoint(winner, why) {
    state = 'point';
    pending[0] = pending[1] = null;
    ai.reset();
    const result = score.pointWon(winner);
    renderScoreboard(scoreEl, score);
    fx.speak(result.announce);
    fx.cheer(mode === 'cpu' && winner === 1 ? 0.4 : 1);
    let text = `${why} ${result.announce}`;
    if (result.setWon) {
      // Like Wii Tennis: show the final result, then start a fresh set.
      setTimeout(() => { score.resetSet(); renderScoreboard(scoreEl, score); }, 2500);
    }
    // CPU gets tougher as you keep winning points.
    if (mode === 'cpu' && winner === 0 && ++pointsAtLevel >= POINTS_TO_LEVEL_UP && levelIndex < LEVEL_ORDER.length - 1) {
      setLevel(levelIndex + 1);
      text += ` Level up: ${ai.level.label}!`;
    }
    showMessage(text);
    setTimeout(resetForServe, result.setWon ? 3000 : 1800);
  }

  // ---------- Input ----------
  const KEYS = {
    KeyD: [0, 'forehand'], ArrowRight: [0, 'forehand'], KeyA: [0, 'backhand'], ArrowLeft: [0, 'backhand'],
    KeyW: [0, 'serve'], ArrowUp: [0, 'serve'], Space: [0, 'auto'],
    KeyL: [1, 'forehand'], KeyJ: [1, 'backhand'], KeyI: [1, 'serve'],
  };
  addEventListener('keydown', (e) => {
    if (!KEYS[e.code]) return;
    unlockAudio();
    const [i, shot] = KEYS[e.code];
    if (i === 1 && online) return; // the online guest controls player 2
    swing(i, shot);
  });
  addEventListener('pointerdown', (e) => { unlockAudio(); if (!e.target.closest('#pair, #pair-toggle, #controls')) swing(0, 'auto'); });

  // ---------- Loop ----------
  function step(dt) {
    if (state === 'serve' && tossed) {
      vel.y += GRAVITY * dt;
      ball.position.y += vel.y * dt;
      if (ball.position.y < 1.0 && vel.y < 0) fault(); // let the ball drop
      return;
    }
    if (state === 'serve') {
      const p = players[server], s = side(server);
      ball.position.set(p.position.x + 0.5 * s, 1.2 + Math.sin(performance.now() / 200) * 0.1, p.position.z - 0.3 * s);
      return;
    }
    if (performance.now() < hitStopUntil) return;

    vel.y += GRAVITY * dt;
    ball.position.addScaledVector(vel, dt);
    if (state === 'rally') { tryPendingHit(0); tryPendingHit(1); }

    // Bounce
    if (ball.position.y < 0.12 && vel.y < 0) {
      ball.position.y = 0.12;
      vel.y *= -0.7;
      vel.x *= 0.85; vel.z *= 0.85;
      if (state === 'rally') {
        bounces++;
        const inX = Math.abs(ball.position.x) <= COURT.halfWidth;
        const inZ = Math.abs(ball.position.z) <= COURT.halfLength;
        const correctSide = Math.sign(ball.position.z) === side(1 - lastHitter);
        if (bounces === 1 && !(inX && inZ && correctSide)) awardPoint(1 - lastHitter, 'Out!');
        else if (bounces >= 2) awardPoint(lastHitter, 'Winner!');
      }
    }

    // Net
    if (state === 'rally' && Math.abs(ball.position.z) < 0.1 && ball.position.y < COURT.netHeight) {
      awardPoint(1 - lastHitter, 'Into the net!');
      vel.set(0, 0, 0);
    }

    if (mode === 'cpu' && state === 'rally' && lastHitter === 0 && bounces === 1 && ai.canReach(ball)) cpuHit();
  }

  function movePlayers(dt) {
    // Wii Tennis style: human players move automatically toward the ball's line.
    players.forEach((p, i) => {
      if (mode === 'cpu' && i === 1) return;
      if (state === 'rally' && lastHitter === 1 - i) {
        const targetX = ball.position.x + vel.x * 0.4 - 0.6 * side(i);
        p.position.x += THREE.MathUtils.clamp(targetX - p.position.x, -7 * dt, 7 * dt);
      }
    });
    if (mode === 'cpu') ai.update(dt);
    players.forEach((p, i) => poseArm(p.userData.arm, anim[i].shot, (performance.now() - anim[i].time) / 280));
  }

  let lastSync = 0;
  let sentBoard = null, sentMessage = null, sentAlert = null;
  function syncGuest() {
    const now = performance.now();
    if (!online || now - lastSync < 33) return;
    lastSync = now;
    // The ball velocity lets the guest predict motion between updates.
    const frozen = state !== 'rally' || now < hitStopUntil;
    const msg = {
      type: 'state',
      ball: ball.position.toArray(),
      vel: frozen ? [0, 0, 0] : vel.toArray(),
      players: players.map((p) => [p.position.x, p.position.z]),
      anim: anim.map((a) => ({ shot: a.shot, age: now - a.time })),
    };
    // Scoreboard/message only when they change, to keep updates small.
    if (scoreEl.innerHTML !== sentBoard) msg.board = sentBoard = scoreEl.innerHTML;
    if (alertEl.innerHTML !== sentAlert) msg.alert = sentAlert = alertEl.innerHTML;
    if (msgEl.textContent !== sentMessage) msg.message = sentMessage = msgEl.textContent;
    send(msg);
  }

  const clock = new THREE.Clock();
  setLevel(0);
  setMode('cpu');

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.033);
    step(dt);
    movePlayers(dt);
    shake *= 0.85;
    if (mode === 'versus' && !online) world.renderSplit(shake);
    else world.render(0, shake);
    syncGuest();
    requestAnimationFrame(animate);
  }
  animate();
}
