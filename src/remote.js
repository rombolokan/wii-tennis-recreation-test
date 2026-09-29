import { connectRelay } from './relay.js';
import { createSwingDetector } from './swingDetector.js';

const room = new URLSearchParams(location.search).get('room') || 'default';
const statusEl = document.getElementById('status');
const shotEl = document.getElementById('shot');
const calEl = document.getElementById('calibrate');
const LABELS = { forehand: 'Forehand', backhand: 'Backhand', serve: 'Serve / Smash' };

const send = connectRelay(room, 'remote', (msg) => {
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
});

function flash(color) {
  document.body.style.background = color;
  setTimeout(() => (document.body.style.background = ''), 150);
}

// Calibration: record one example swing per type, in order.
const calOrder = ['forehand', 'backhand', 'serve'];
let calStep = -1;

const detector = createSwingDetector(({ feature, type, power }) => {
  if (calStep >= 0) {
    detector.setExample(calOrder[calStep], feature);
    calStep++;
    if (calStep === calOrder.length) {
      calStep = -1;
      calEl.textContent = 'Recalibrate swings';
      shotEl.textContent = 'Calibrated ✓ — go play!';
    } else {
      shotEl.textContent = `Now swing a ${LABELS[calOrder[calStep]].toUpperCase()}`;
    }
    return;
  }
  swing(type, power);
});

function swing(type, power) {
  shotEl.textContent = LABELS[type];
  send({ type: 'swing', shot: type, power });
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
  shotEl.textContent = 'Swing a FOREHAND';
};

for (const btn of document.querySelectorAll('[data-shot]')) {
  btn.onclick = () => swing(btn.dataset.shot, 0.7);
}
