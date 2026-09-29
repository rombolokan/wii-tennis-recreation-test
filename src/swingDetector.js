// Detects swings from DeviceMotion events and classifies them as forehand, backhand or serve.
// A swing starts when linear acceleration crosses TRIGGER; we then keep recording for
// POST_MS so the feature describes the WHOLE swing (wind-up + strike), not just its onset.
// Feature = total rotation (gyro) + rotation at the peak moment + how the phone was held
// (gravity). With calibration, the nearest recorded example wins (several per type).

const PRE_MS = 250;
const POST_MS = 130;
const COOLDOWN_MS = 500;
const TRIGGER = 9; // m/s² — low enough that gentle swings register
export const EXAMPLES_PER_TYPE = 3;
const STORAGE_KEY = 'swingExamples.v2';

const norm = (v) => {
  const m = Math.hypot(...v) || 1;
  return v.map((x) => x / m);
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function createSwingDetector(onSwing) {
  const samples = [];
  let lastSwing = 0;
  let captureStart = null;
  let examples = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); // type -> [feature]

  const isCalibrated = () => ['forehand', 'backhand', 'serve'].every((t) => examples[t]?.length);

  function classify(f) {
    if (isCalibrated()) {
      let best = null, bestD = Infinity;
      for (const [type, list] of Object.entries(examples)) {
        for (const ex of list) {
          const d = ex.reduce((s, x, i) => s + (x - f[i]) ** 2, 0);
          if (d < bestD) { bestD = d; best = type; }
        }
      }
      return best;
    }
    // Heuristic: overhead chop turns the phone mostly around its x axis (beta);
    // forehand/backhand sweep around the other axes in opposite directions.
    const [a, b, g] = f;
    if (Math.abs(b) > Math.abs(a) && Math.abs(b) > Math.abs(g)) return 'serve';
    return a + g < 0 ? 'forehand' : 'backhand';
  }

  function finish(now) {
    const win = samples.filter((s) => s.t >= captureStart - PRE_MS);
    captureStart = null;
    lastSwing = now;
    let peakLin = 0, peak = win[0];
    const rot = [0, 0, 0];
    for (const s of win) {
      rot[0] += s.a; rot[1] += s.b; rot[2] += s.g;
      peakLin = Math.max(peakLin, s.lin);
      if (s.speed > peak.speed) peak = s;
    }
    const feature = [
      ...norm(rot).map((x) => x * 1.5), // overall swing direction matters most
      ...norm([peak.a, peak.b, peak.g]),
      ...norm(win[0].grav).map((x) => x * 0.7),
    ];
    // Power blends how hard the phone was thrust and how fast it rotated.
    const power = clamp(0.5 * (peakLin - TRIGGER) / 22 + 0.5 * peak.speed / 1100, 0.1, 1);
    onSwing({ feature, type: classify(feature), power });
  }

  function handle(e) {
    const now = performance.now();
    const r = e.rotationRate || {};
    const grav = e.accelerationIncludingGravity || {};
    const l = e.acceleration;
    const a = r.alpha || 0, b = r.beta || 0, g = r.gamma || 0;
    const lin = l
      ? Math.hypot(l.x || 0, l.y || 0, l.z || 0)
      : Math.abs(Math.hypot(grav.x || 0, grav.y || 0, grav.z || 0) - 9.8);
    samples.push({ t: now, a, b, g, speed: Math.hypot(a, b, g), lin, grav: [grav.x || 0, grav.y || 0, grav.z || 0] });
    while (samples.length && now - samples[0].t > PRE_MS + POST_MS + 200) samples.shift();

    if (captureStart != null) {
      if (now - captureStart >= POST_MS) finish(now);
      return;
    }
    if (lin > TRIGGER && now - lastSwing > COOLDOWN_MS && samples.length >= 3) captureStart = now;
  }

  return {
    handle,
    addExample(type, feature) {
      (examples[type] ||= []).push(feature);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(examples));
    },
    clearExamples() { examples = {}; localStorage.removeItem(STORAGE_KEY); },
    isCalibrated,
  };
}
