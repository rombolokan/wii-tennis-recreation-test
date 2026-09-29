// Connects to the dev server's relay for a room. Reconnects automatically.
export function connectRelay(room, role, onMessage, onStatus = () => {}) {
  let ws;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/relay?room=${room}&role=${role}`);
    ws.onopen = () => onStatus(true);
    ws.onclose = () => { onStatus(false); setTimeout(open, 1000); };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  };
  open();
  return (msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
}
