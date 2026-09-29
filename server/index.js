// Standalone relay server for production (e.g. Render). Run with `npm start`.
import { createServer } from 'http';
import { attachRelay } from './relay.js';

const server = createServer((req, res) => res.end('relay ok'));
attachRelay(server);
server.listen(process.env.PORT || 8080, () => console.log('Relay listening'));
