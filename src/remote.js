import { connectRelay } from './relay.js';
import { createSwingDetector, EXAMPLES_PER_TYPE } from './swingDetector.js';

const params = new URLSearchParams(location.search);
const room = params.get('room') || 'default';
const player = Number(params.get('p')) || 1;
document.querySelector('h1').textContent = `🎾 Player ${player}`;
const statusEl = document.getElementById('status');
const shotEl = document.getElementById('shot');
const calEl = document.getElementById('calibrate');
const LABELS = { forehand: 'Forehand', backhand: 'Backhand', serve: 'Serve / Smash' };

const send = connectRelay(room, 'remote', (msg) => {
  if (msg.player !== player) return;
  // Feedback from the game: buzz + flash only when the racket actually met the ball.
  if (msg.type === 'hit') {
    navigator.vibrate?.(70);
    flash('#3c3');
  } else if (msg.type === 'miss') {
    navigator.vibrate?.([20, 40, 20]);
    flash('#d44');
  }
}, (ok) => {
  statusEl.textContent = ok ? `Connected to room ${room}` : 'Reconnecting…';
}, player);

function flash(color) {
  document.body.style.background = color;
  setTimeout(() => (document.body.style.background = ''), 150);
}

// Calibration: record several example swings per type, in order.
const calOrder = ['forehand', 'backhand', 'serve'].flatMap((t) => Array(EXAMPLES_PER_TYPE).fill(t));
let calStep = -1;
const calPrompt = () => {
  const n = (calStep % EXAMPLES_PER_TYPE) + 1;
  shotEl.textContent = `Swing a ${LABELS[calOrder[calStep]].toUpperCase()} (${n}/${EXAMPLES_PER_TYPE})`;
};

const detector = createSwingDetector(({ feature, type, power, raw, spin }) => {
  if (calStep >= 0) {
    detector.addExample(calOrder[calStep], feature);
    detector.addStrength(raw);
    navigator.vibrate?.(40);
    calStep++;
    if (calStep === calOrder.length) {
      calStep = -1;
      calEl.textContent = 'Recalibrate swings';
      shotEl.textContent = 'Calibrated ✓ — go play!';
    } else calPrompt();
    return;
  }
  swing(type, power, spin);
});

function swing(type, power, spin) {
  const spinText = spin > 0.3 ? ' · topspin' : spin < -0.3 ? ' · slice' : '';
  shotEl.textContent = `${LABELS[type]} · ${Math.round(power * 100)}% power${spinText}`;
  send({ type: 'swing', player, shot: type, power, spin });
}

document.getElementById('start').onclick = async (ev) => {
  if (typeof DeviceMotionEvent?.requestPermission === 'function') {
    const res = await DeviceMotionEvent.requestPermission();
    if (res !== 'granted') { statusEl.textContent = 'Motion permission denied'; return; }
  }
  window.addEventListener('devicemotion', detector.handle);
  ev.target.textContent = 'Motion enabled ✓';
  ev.target.disabled = true;
  calEl.hidden = false;
};

if (detector.isCalibrated()) calEl.textContent = 'Recalibrate swings';
calEl.onclick = () => {
  detector.clearExamples();
  calStep = 0;
  calPrompt();
};

for (const btn of document.querySelectorAll('[data-shot]')) {
  btn.onclick = () => swing(btn.dataset.shot, 0.7);
}
