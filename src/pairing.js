const qr = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(url)}`;

export const remoteUrl = (room, player) => `${location.origin}/remote.html?room=${room}&p=${player}`;

// cards: [{ title, url, connected }]. online: { inviteUrl } | { connected: true } | null.
export function renderPairing(el, cards, online, hint) {
  el.innerHTML = `
    <div class="cards">${cards.map((c) => `
      <div class="card">
        <b>${c.title}</b>
        <img src="${qr(c.url)}" alt="QR code" />
        <a class="url" href="${c.url}" target="_blank">${c.url}</a>
        <div class="status">${c.connected ? 'Connected ✓' : 'Not connected'}</div>
      </div>`).join('')}
    </div>
    ${online?.connected ? '<div class="online">🌐 Online opponent connected</div>' : ''}
    ${online?.inviteUrl ? `
      <div class="online">
        <b>Play online</b> — send this link to a friend:
        <div class="url">${online.inviteUrl}</div>
        <button id="copy-invite">Copy link</button>
      </div>` : ''}
    <div class="hint">${hint}</div>`;
  const copy = el.querySelector('#copy-invite');
  if (copy) copy.onclick = () => navigator.clipboard.writeText(online.inviteUrl).then(() => (copy.textContent = 'Copied ✓'));
}
