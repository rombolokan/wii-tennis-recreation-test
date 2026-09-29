// Connects to the dev server's relay for a room. Reconnects automatically.
// `player` (1 or 2) tags phone remotes so the game knows who is swinging.
export function connectRelay(room, role, onMessage, onStatus = () => {}, player = '') {
  let ws;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    // VITE_RELAY_URL (e.g. wss://my-relay.onrender.com) points production builds at the hosted relay.
    const base = import.meta.env.VITE_RELAY_URL || `${proto}://${location.host}`;
    ws = new WebSocket(`${base}/relay?room=${room}&role=${role}&p=${player}`);
    ws.onopen = () => onStatus(true);
    ws.onclose = () => { onStatus(false); setTimeout(open, 1000); };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  };
  open();
  return (msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
}
