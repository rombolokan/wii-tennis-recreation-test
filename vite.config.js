import { defineConfig } from 'vite';
import { resolve } from 'path';
import { attachRelay } from './server/relay.js';

// In dev, the relay runs inside the Vite server; in production it runs via server/index.js.
function remoteRelay() {
  return {
    name: 'remote-relay',
    configureServer(server) {
      attachRelay(server.httpServer);
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
