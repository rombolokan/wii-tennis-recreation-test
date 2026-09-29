import { startHost } from './host.js';
import { startGuest } from './guest.js';
import { showHome } from './home.js';

const toggle = document.getElementById('pair-toggle');
toggle.onclick = () => {
  const pair = document.getElementById('pair');
  pair.hidden = !pair.hidden;
  toggle.textContent = pair.hidden ? 'Show QR' : 'Hide QR';
};
document.getElementById('home-btn').onclick = () => (location.href = '/');

// The home screen picks the players first. `/?join=ROOM` opens an online guest screen;
// otherwise this screen hosts the match.
const join = new URLSearchParams(location.search).get('join');
showHome({ guest: !!join }).then((choice) => {
  if (join) startGuest(join, choice.p1);
  else startHost(choice);
});
