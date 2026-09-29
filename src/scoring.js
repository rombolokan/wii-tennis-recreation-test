// Tennis scoring: points (love/15/30/40/deuce/advantage) → games → one set (first to 6, win by 2).
const CALLS = ['Love', '15', '30', '40'];
const SPOKEN = { Love: 'love', 15: 'fifteen', 30: 'thirty', 40: 'forty' };
const NAMES = ['You', 'CPU'];
const GAMES_TO_WIN_SET = 6;

export function createScore() {
  let points = [0, 0];
  let games = [0, 0];

  function pointCall() {
    const [a, b] = points;
    if (a >= 3 && b >= 3) {
      if (a === b) return { display: ['40', '40'], spoken: 'Deuce' };
      const lead = a > b ? 0 : 1;
      return { display: lead === 0 ? ['AD', ''] : ['', 'AD'], spoken: `Advantage ${NAMES[lead]}` };
    }
    const [ca, cb] = [CALLS[a], CALLS[b]];
    const spoken = a === b ? `${SPOKEN[ca]} all` : `${SPOKEN[ca]} ${SPOKEN[cb]}`;
    return { display: [ca, cb], spoken };
  }

  return {
    // who: 0 = you, 1 = CPU. Returns what to announce and whether a game/set ended.
    pointWon(who) {
      points[who]++;
      const [p, o] = [points[who], points[1 - who]];
      if (p >= 4 && p - o >= 2) {
        points = [0, 0];
        games[who]++;
        const g = games[who], og = games[1 - who];
        if (g >= GAMES_TO_WIN_SET && g - og >= 2) {
          return { announce: `Game, set, ${NAMES[who]}! ${g}–${og}`, setWon: true };
        }
        return { announce: `Game, ${NAMES[who]}!`, gameWon: true };
      }
      return { announce: pointCall().spoken };
    },
    resetSet() { points = [0, 0]; games = [0, 0]; },
    get display() { return { points: pointCall().display, games: [...games] }; },
  };
}

export function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace('CPU', 'C P U'));
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

export function renderScoreboard(el, score) {
  const { points, games } = score.display;
  el.innerHTML = `
    <table>
      <tr><th></th><th>Games</th><th>Points</th></tr>
      <tr><td class="you">You</td><td>${games[0]}</td><td>${points[0]}</td></tr>
      <tr><td class="cpu">CPU</td><td>${games[1]}</td><td>${points[1]}</td></tr>
    </table>`;
}
