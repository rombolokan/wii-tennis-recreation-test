import { startHost } from './host.js';
import { startGuest } from './guest.js';

// `/?join=ROOM` opens an online guest screen; otherwise this screen hosts the match.
const toggle = document.getElementById('pair-toggle');
toggle.onclick = () => {
  const pair = document.getElementById('pair');
  pair.hidden = !pair.hidden;
  toggle.textContent = pair.hidden ? 'Show QR' : 'Hide QR';
};

const join = new URLSearchParams(location.search).get('join');
if (join) startGuest(join);
else startHost();
