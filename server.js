// Production server: serves the Vite build from dist/ and hosts the /relay WebSocket on the same port.
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { attachRelay } from './relay.js';

const DIST = join(process.cwd(), 'dist');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(DIST, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

attachRelay(server);
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));
