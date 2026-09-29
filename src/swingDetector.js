// Detects swings from DeviceMotion events and classifies them as forehand, backhand or serve.
// Each swing becomes a feature: the rotation accumulated during the swing (gyroscope)
// plus the direction of gravity just before it (how the phone was held). If the user
// calibrated, the nearest recorded example wins; otherwise a simple heuristic is used.

const WINDOW_MS = 300;
const COOLDOWN_MS = 450;
const THRESHOLD = 14; // m/s² of linear acceleration

const norm = (v) => {
  const m = Math.hypot(...v) || 1;
  return v.map((x) => x / m);
};

export function createSwingDetector(onSwing) {
  const samples = [];
  let lastSwing = 0;
  let examples = JSON.parse(localStorage.getItem('swingExamples') || '{}');

  function classify(f) {
    const types = Object.keys(examples);
    if (types.length === 3) {
      let best = null, bestD = Infinity;
      for (const t of types) {
        const d = examples[t].reduce((s, x, i) => s + (x - f[i]) ** 2, 0);
        if (d < bestD) { bestD = d; best = t; }
      }
      return best;
    }
    // Heuristic: overhead chop turns the phone mostly around its short (x) axis;
    // forehand/backhand sweep around the long/screen axes in opposite directions.
    const [a, b, g] = f;
    if (Math.abs(b) > Math.abs(a) && Math.abs(b) > Math.abs(g)) return 'serve';
    return a + g < 0 ? 'forehand' : 'backhand';
  }

  function handle(e) {
    const now = performance.now();
    const r = e.rotationRate || {};
    const grav = e.accelerationIncludingGravity || {};
    const lin = e.acceleration;
    samples.push({ t: now, a: r.alpha || 0, b: r.beta || 0, g: r.gamma || 0, grav: [grav.x || 0, grav.y || 0, grav.z || 0] });
    while (samples.length && now - samples[0].t > WINDOW_MS) samples.shift();

    const mag = lin
      ? Math.hypot(lin.x || 0, lin.y || 0, lin.z || 0)
      : Math.abs(Math.hypot(grav.x || 0, grav.y || 0, grav.z || 0) - 9.8);
    if (mag < THRESHOLD || now - lastSwing < COOLDOWN_MS || samples.length < 3) return;
    lastSwing = now;

    const rot = samples.reduce((s, p) => [s[0] + p.a, s[1] + p.b, s[2] + p.g], [0, 0, 0]);
    const feature = [...norm(rot), ...norm(samples[0].grav)];
    onSwing({ feature, type: classify(feature), power: Math.min(1, mag / 35) });
  }

  return {
    handle,
    setExample(type, feature) {
      examples[type] = feature;
      localStorage.setItem('swingExamples', JSON.stringify(examples));
    },
    clearExamples() { examples = {}; localStorage.removeItem('swingExamples'); },
    isCalibrated: () => Object.keys(examples).length === 3,
  };
}
