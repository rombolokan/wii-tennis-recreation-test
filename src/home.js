import { getUsers, createUser, rememberUser, rememberedUser } from './api.js';

const COLORS = ['#2a8cff', '#ff5a5a', '#2bb673', '#ff9f1c', '#9b5de5', '#f15bb5'];
const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Home screen: pick (or create) who's playing, then choose a mode.
// Resolves with { mode: 'cpu' | 'versus' | 'join', p1, p2 }.
export function showHome({ guest = false } = {}) {
  const el = document.getElementById('home');
  el.hidden = false;
  let users = [];
  let p1 = rememberedUser();
  let p2 = null;

  return new Promise((resolve) => {
    const chips = (seat, selected, exclude) => users
      .filter((u) => u.id !== exclude?.id)
      .map((u) => `<button class="chip ${u.id === selected?.id ? 'active' : ''}" data-seat="${seat}" data-id="${u.id}" style="--c:${u.color}">${esc(u.name)}</button>`)
      .join('') || '<span class="muted">No players yet — create one below.</span>';

    function render() {
      el.innerHTML = `
        <div class="home-card">
          <h1>🎾 Tel Aviv Beach Tennis</h1>
          <h3>${guest ? 'Who are you?' : 'Player 1'}</h3>
          <div class="chips">${chips(1, p1)}</div>
          <form id="new-user">
            <input name="name" maxlength="20" placeholder="New player name" required />
            <button>Create</button>
          </form>
          ${guest ? '' : `
            <h3>Player 2 <span class="muted">(same-screen matches)</span></h3>
            <div class="chips">${chips(2, p2, p1)}</div>`}
          <div class="actions">
            ${guest
              ? '<button data-go="join" class="primary">Join online match</button>'
              : `<button data-go="cpu" class="primary">▶ Play vs CPU</button>
                 <button data-go="versus" class="primary">👥 2 Players</button>`}
          </div>
          <div class="error" id="home-error"></div>
          ${guest ? '' : '<p class="muted">Playing online? Start a match and send the invite link from the side panel.</p>'}
          <a class="scores-link" href="/stats.html${p1 ? `?user=${p1.id}` : ''}">🏆 Scores & head-to-head</a>
        </div>`;

      el.querySelector('#new-user').onsubmit = async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const user = await createUser(name, COLORS[users.length % COLORS.length]);
        users = await getUsers();
        if (!p1 || guest) p1 = user;
        else if (!p2 && user.id !== p1.id) p2 = user;
        else p1 = user;
        render();
      };
      for (const b of el.querySelectorAll('.chip')) {
        b.onclick = () => {
          const u = users.find((x) => x.id === b.dataset.id);
          if (b.dataset.seat === '1') { p1 = u; if (p2?.id === u.id) p2 = null; } else p2 = u;
          render();
        };
      }
      for (const b of el.querySelectorAll('[data-go]')) {
        b.onclick = () => {
          const mode = b.dataset.go;
          const error = el.querySelector('#home-error');
          if (!p1) return (error.textContent = 'Pick or create a player first.');
          if (mode === 'versus' && !p2) return (error.textContent = 'Pick Player 2 for a 2-player match.');
          rememberUser(p1);
          el.hidden = true;
          resolve({ mode, p1, p2: mode === 'versus' ? p2 : null });
        };
      }
    }

    getUsers().then((list) => {
      users = list;
      if (p1 && !users.some((u) => u.id === p1.id)) p1 = null; // removed/unknown on this server
      render();
    });
    render();
  });
}
