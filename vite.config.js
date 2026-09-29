import { defineConfig } from 'vite';
import { resolve } from 'path';
import { WebSocketServer } from 'ws';

// Relays messages between a game screen and phone remotes that share a room code.
function remoteRelay() {
  return {
    name: 'remote-relay',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map(); // room -> Set of sockets

      server.httpServer.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url, 'http://x');
        if (url.pathname !== '/relay') return;
        wss.handleUpgrade(req, socket, head, (ws) => {
          const room = url.searchParams.get('room') || 'default';
          const role = url.searchParams.get('role') || 'game';
          ws.role = role;
          if (!rooms.has(room)) rooms.set(room, new Set());
          const peers = rooms.get(room);
          peers.add(ws);
          const broadcast = (msg) => {
            for (const p of peers) if (p !== ws && p.readyState === 1) p.send(msg);
          };
          if (role === 'remote') broadcast(JSON.stringify({ type: 'remote-connected' }));
          ws.on('message', (data) => broadcast(data.toString()));
          ws.on('close', () => {
            peers.delete(ws);
            if (role === 'remote') broadcast(JSON.stringify({ type: 'remote-disconnected' }));
            if (!peers.size) rooms.delete(room);
          });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [remoteRelay()],
  server: { watch: { usePolling: true } },
  build: {
    rollupOptions: {
      input: { main: resolve('index.html'), remote: resolve('remote.html') },
    },
  },
});
