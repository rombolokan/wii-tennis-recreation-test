// Client for the player/match store served by the dev server (server/store.js).
export const CPU_USER = { id: 'cpu', name: 'CPU', color: '#ff5a5a' };

const call = (path, body) =>
  fetch(`/api${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
    .then((r) => r.json());

export const getUsers = () => call('/users');
export const createUser = (name, color) => call('/users', { name, color });
export const getMatches = (userId) => call(`/matches?user=${encodeURIComponent(userId)}`);
export const saveMatch = (p1, p2, games) => call('/matches', { p1, p2, games });

// The last player chosen on this device, so they're preselected next time.
export const rememberUser = (u) => localStorage.setItem('currentUser', JSON.stringify(u));
export const rememberedUser = () => JSON.parse(localStorage.getItem('currentUser') || 'null');
