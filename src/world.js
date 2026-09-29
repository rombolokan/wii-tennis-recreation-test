import * as THREE from 'three';
import { buildCourt, makePlayer, COURT } from './scene.js';
import { addCourtLogos } from './courtLogo.js';
import { buildBeach } from './beach.js';
import { createImpactFlash } from './effects.js';

// The 3D scene shared by the host and the online guest screen.
export function createWorld() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  buildCourt(scene);
  addCourtLogos(scene);
  const env = buildBeach(scene);
  const impact = createImpactFlash(scene);

  const p1 = makePlayer(0x2a8cff);
  p1.position.set(0, 0, COURT.halfLength + 1);
  const p2 = makePlayer(0xff5a5a, { hair: 0x111111, skin: 0xd9a276 });
  p2.position.set(0, 0, -COURT.halfLength - 1);
  p2.rotation.y = Math.PI;
  scene.add(p1, p2);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd8ff3a }));
  ball.castShadow = true;
  scene.add(ball);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const players = [p1, p2];
  // Camera sits behind the given player (0 = near side, 1 = far side).
  function aim(view, shake, aspect) {
    const s = view === 0 ? 1 : -1;
    const jitter = () => (Math.random() - 0.5) * shake;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 70 : 55; // widen the view for tall half-screens
    camera.updateProjectionMatrix();
    camera.position.set(players[view].position.x * 0.5 + jitter(), 5 + jitter(), s * (COURT.halfLength + 8));
    camera.lookAt(0, 0, -2 * s);
  }
  function update() {
    impact.update();
    env.update(performance.now() / 1000);
  }
  return {
    ball, players, env, impact,
    render(view, shake = 0) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, innerWidth, innerHeight);
      aim(view, shake, innerWidth / innerHeight);
      update();
      renderer.render(scene, camera);
    },
    // Same-screen 2 players: left half = Player 1's view, right half = Player 2's view.
    renderSplit(shake = 0) {
      update();
      const w = Math.floor(innerWidth / 2), gap = 2;
      renderer.setScissorTest(true);
      renderer.setClearColor(0x111111);
      renderer.clear();
      [0, 1].forEach((view) => {
        const x = view * (w + gap / 2), vw = w - gap / 2;
        renderer.setViewport(x, 0, vw, innerHeight);
        renderer.setScissor(x, 0, vw, innerHeight);
        aim(view, shake, vw / innerHeight);
        renderer.render(scene, camera);
      });
    },
  };
}
