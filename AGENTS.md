# Agent notes

- Vanilla JS + Three.js, served by Vite dev server on port 3000 (`docker-compose.base44.yml`, single `web` service).
- Entry `src/main.js`: `/` = host screen (`host.js`, runs all game logic); `/?join=ROOM` = online guest screen (`guest.js`, render-only mirror from Player 2's side, fed by host `state`/`fx` messages).
- `/` first shows the home screen (`home.js`: pick/create name-only profiles, choose mode); `/stats.html?user=ID` = scores & head-to-head.
- Profiles + match results: `server/store.js` (Vite plugin, `/api/users`, `/api/matches`), a JSON file at `DB_PATH` (compose: `/data/db.json` on the `app_data` volume). A match is saved when a set ends and both seats have a profile (CPU = id `cpu`). Online guest sends `guest-hello` with its profile.
- Phone remote: `/remote.html?room=CODE&p=1|2`. The WebSocket relay (`/relay?room=&role=game|guest|remote&p=`) is a Vite plugin inside `vite.config.js` — no separate backend. It broadcasts every message to all other peers in the room and announces `<role>-connected/-disconnected` with `player`. Changing `vite.config.js` restarts Vite automatically.
- Phone motion (DeviceMotion) needs HTTPS; the public preview URL provides it. iOS requires tapping "enable motion" for permission.
- QR code images come from api.qrserver.com (external, no key).
- Verify: open `/`, read the room from the invite link in the panel, connect a WebSocket to `/relay?room=<room>&role=remote&p=1` and send `{"type":"swing","player":1,"shot":"serve"}` — panel shows "Connected ✓" and the ball is served.
