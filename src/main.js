import { startHost } from './host.js';
import { startGuest } from './guest.js';

// `/?join=ROOM` opens an online guest screen; otherwise this screen hosts the match.
const join = new URLSearchParams(location.search).get('join');
if (join) startGuest(join);
else startHost();
