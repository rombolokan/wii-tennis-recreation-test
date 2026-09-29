# Agent notes

- Vanilla JS + Three.js, served by Vite dev server on port 3000 (`docker-compose.base44.yml`, single `web` service).
- Phone remote: `/remote.html?room=CODE`. The WebSocket relay (`/relay?room=&role=game|remote`) is a Vite plugin inside `vite.config.js` — there is no separate backend. Changing `vite.config.js` restarts Vite automatically.
- Phone motion (DeviceMotion) needs HTTPS; the public preview URL provides it. iOS requires tapping "enable motion" for permission.
- QR code image comes from api.qrserver.com (external, no key).
- Verify: open `/`, connect a WebSocket to `/relay?room=<code shown>&role=remote` and send `{"type":"swing"}` — the status should read "Phone: connected" and the ball gets served.
