// Connects to the dev server's relay for a room. Reconnects automatically.
// `player` (1 or 2) tags phone remotes so the game knows who is swinging.
export function connectRelay(room, role, onMessage, onStatus = () => {}, player = '') {
  let ws;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/relay?room=${room}&role=${role}&p=${player}`);
    ws.onopen = () => onStatus(true);
    ws.onclose = () => { onStatus(false); setTimeout(open, 1000); };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  };
  open();
  return (msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
}
