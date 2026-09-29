import { getUsers, getMatches, rememberedUser } from './api.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const select = document.getElementById('user');
const summaryEl = document.getElementById('summary');
const h2hEl = document.getElementById('h2h');
const recentEl = document.getElementById('recent');

async function show(userId) {
  history.replaceState(null, '', `?user=${userId}`);
  const matches = await getMatches(userId);

  // Group results by opponent.
  const opponents = new Map();
  for (const m of matches) {
    const me = m.p1.id === userId ? 0 : 1;
    const opp = me === 0 ? m.p2 : m.p1;
    const row = opponents.get(opp.id) || { name: opp.name, played: 0, wins: 0, gamesFor: 0, gamesAgainst: 0 };
    row.name = opp.name;
    row.played++;
    if (m.winner === userId) row.wins++;
    row.gamesFor += m.games[me];
    row.gamesAgainst += m.games[1 - me];
    opponents.set(opp.id, row);
  }

  const wins = matches.filter((m) => m.winner === userId).length;
  summaryEl.innerHTML = `
    <div class="stat"><b>${matches.length}</b>Matches</div>
    <div class="stat"><b>${wins}</b>Wins</div>
    <div class="stat"><b>${matches.length - wins}</b>Losses</div>`;

  h2hEl.innerHTML = opponents.size ? `
    <table>
      <tr><th>Opponent</th><th>Played</th><th>W – L</th><th>Games</th></tr>
      ${[...opponents.values()].sort((a, b) => b.played - a.played).map((o) => `
        <tr><td>${esc(o.name)}</td><td>${o.played}</td><td>${o.wins} – ${o.played - o.wins}</td><td>${o.gamesFor} – ${o.gamesAgainst}</td></tr>`).join('')}
    </table>` : '<p class="muted">No matches yet — go play a set!</p>';

  recentEl.innerHTML = matches.slice(0, 20).map((m) => {
    const me = m.p1.id === userId ? 0 : 1;
    const opp = me === 0 ? m.p2 : m.p1;
    const won = m.winner === userId;
    return `<div class="match ${won ? 'won' : 'lost'}">
      <span>${won ? 'W' : 'L'}</span>
      <span>vs ${esc(opp.name)}</span>
      <b>${m.games[me]}–${m.games[1 - me]}</b>
      <time>${new Date(m.date).toLocaleString()}</time>
    </div>`;
  }).join('');
}

getUsers().then((users) => {
if (!users.length) {
  summaryEl.innerHTML = '<p class="muted">No players yet. Create one on the home screen.</p>';
} else {
  select.innerHTML = users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
  const wanted = new URLSearchParams(location.search).get('user') || rememberedUser()?.id;
  if (users.some((u) => u.id === wanted)) select.value = wanted;
  select.onchange = () => show(select.value);
  show(select.value);
}
});
