import { WebSocketServer } from 'ws';

// Relays messages between a game screen and phone remotes that share a room code.
// Roles: game (host screen), guest (online opponent screen), remote (phone, tagged with player p).
export function attachRelay(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map(); // room -> Set of sockets

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/relay') return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      const room = url.searchParams.get('room') || 'default';
      const role = url.searchParams.get('role') || 'game';
      if (!rooms.has(room)) rooms.set(room, new Set());
      const peers = rooms.get(room);
      peers.add(ws);
      const broadcast = (msg) => {
        for (const p of peers) if (p !== ws && p.readyState === 1) p.send(msg);
      };
      const player = Number(url.searchParams.get('p')) || undefined;
      broadcast(JSON.stringify({ type: `${role}-connected`, player }));
      ws.on('message', (data) => broadcast(data.toString()));
      ws.on('close', () => {
        peers.delete(ws);
        broadcast(JSON.stringify({ type: `${role}-disconnected`, player }));
        if (!peers.size) rooms.delete(room);
      });
    });
  });
}
