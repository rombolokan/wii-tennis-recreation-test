# Agent notes

- Vanilla JS + Three.js, served by Vite dev server on port 3000 (`docker-compose.base44.yml`, single `web` service).
- Entry `src/main.js`: `/` = host screen (`host.js`, runs all game logic); `/?join=ROOM` = online guest screen (`guest.js`, render-only mirror from Player 2's side, fed by host `state`/`fx` messages).
- Phone remote: `/remote.html?room=CODE&p=1|2`. The WebSocket relay (`/relay?room=&role=game|guest|remote&p=`) is a Vite plugin inside `vite.config.js` — no separate backend. It broadcasts every message to all other peers in the room and announces `<role>-connected/-disconnected` with `player`. Changing `vite.config.js` restarts Vite automatically.
- Phone motion (DeviceMotion) needs HTTPS; the public preview URL provides it. iOS requires tapping "enable motion" for permission.
- QR code images come from api.qrserver.com (external, no key).
- Verify: open `/`, read the room from the invite link in the panel, connect a WebSocket to `/relay?room=<room>&role=remote&p=1` and send `{"type":"swing","player":1,"shot":"serve"}` — panel shows "Connected ✓" and the ball is tossed; a second swing while it's above 1.3m serves it (letting it drop = fault, two faults = point to opponent).
