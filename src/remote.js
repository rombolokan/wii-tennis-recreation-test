import { connectRelay } from './relay.js';

const room = new URLSearchParams(location.search).get('room') || 'default';
const statusEl = document.getElementById('status');
const send = connectRelay(room, 'remote', () => {}, (ok) => {
  statusEl.textContent = ok ? `Connected to room ${room}` : 'Reconnecting…';
});

let lastSwing = 0;
function swing(power) {
  const now = Date.now();
  if (now - lastSwing < 400) return;
  lastSwing = now;
  send({ type: 'swing', power });
  navigator.vibrate?.(40);
}

function onMotion(e) {
  const a = e.acceleration || e.accelerationIncludingGravity;
  if (!a) return;
  const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  const threshold = e.acceleration ? 15 : 25;
  if (mag > threshold) swing(Math.min(1, mag / 40));
}

document.getElementById('start').onclick = async (ev) => {
  if (typeof DeviceMotionEvent?.requestPermission === 'function') {
    const res = await DeviceMotionEvent.requestPermission();
    if (res !== 'granted') { statusEl.textContent = 'Motion permission denied'; return; }
  }
  window.addEventListener('devicemotion', onMotion);
  ev.target.textContent = 'Motion enabled ✓';
  ev.target.disabled = true;
};
document.getElementById('swing').onclick = () => swing(0.7);
