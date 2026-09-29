import fs from 'fs';
import path from 'path';

// Tiny JSON-file store for player profiles and match results, served under /api.
//   GET  /api/users                 -> [{ id, name, color }]
//   POST /api/users { name, color } -> existing user with that name, or a new one
//   GET  /api/matches?user=ID       -> matches the user played (newest first)
//   POST /api/matches { p1, p2, games: [a, b] } -> saved match
const DB_PATH = process.env.DB_PATH || '.data/db.json';

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return { users: [], matches: [] }; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
const readBody = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
});

export function apiStore() {
  return {
    name: 'api-store',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const url = new URL(req.url, 'http://x');
        const json = (status, body) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        const db = load();

        if (url.pathname === '/users' && req.method === 'GET') return json(200, db.users);
        if (url.pathname === '/users' && req.method === 'POST') {
          const { name, color } = await readBody(req);
          const clean = String(name || '').trim().slice(0, 20);
          if (!clean) return json(400, { error: 'Name is required' });
          let user = db.users.find((u) => u.name.toLowerCase() === clean.toLowerCase());
          if (!user) {
            user = { id: Math.random().toString(36).slice(2, 10), name: clean, color: color || '#2a8cff' };
            db.users.push(user);
            save(db);
          }
          return json(200, user);
        }
        if (url.pathname === '/matches' && req.method === 'GET') {
          const id = url.searchParams.get('user');
          return json(200, db.matches.filter((m) => m.p1.id === id || m.p2.id === id).reverse());
        }
        if (url.pathname === '/matches' && req.method === 'POST') {
          const { p1, p2, games } = await readBody(req);
          if (!p1?.id || !p2?.id || !Array.isArray(games)) return json(400, { error: 'Invalid match' });
          const match = {
            id: Math.random().toString(36).slice(2, 10),
            date: new Date().toISOString(),
            p1: { id: p1.id, name: p1.name }, p2: { id: p2.id, name: p2.name },
            games, winner: games[0] > games[1] ? p1.id : p2.id,
          };
          db.matches.push(match);
          save(db);
          return json(200, match);
        }
        json(404, { error: 'Not found' });
      });
    },
  };
}
