import { startHost } from './host.js';
import { startGuest } from './guest.js';

// `/?join=ROOM` opens an online guest screen; otherwise this screen hosts the match.
const toggle = document.getElementById('pair-toggle');
const pair = document.getElementById('pair');
const setPairHidden = (hidden) => {
  pair.hidden = hidden;
  toggle.textContent = hidden ? 'Show QR' : 'Hide QR';
};
toggle.onclick = () => setPairHidden(!pair.hidden);
// Mobile: start with the QR panel collapsed.
if (matchMedia('(max-width: 768px)').matches) setPairHidden(true);

const join = new URLSearchParams(location.search).get('join');
if (join) startGuest(join);
else startHost();
