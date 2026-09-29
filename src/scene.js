import * as THREE from 'three';

export const COURT = { halfWidth: 4.1, halfLength: 11.9, netHeight: 0.95 };

export function buildCourt(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(8, 20, 10);
  sun.castShadow = true;
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x5fae4a }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.01;
  grass.receiveShadow = true;
  scene.add(grass);

  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT.halfWidth * 2 + 3, COURT.halfLength * 2 + 6),
    new THREE.MeshStandardMaterial({ color: 0x3f8f5a })
  );
  court.rotation.x = -Math.PI / 2;
  court.receiveShadow = true;
  scene.add(court);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = (w, l, x, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.005, z);
    scene.add(m);
  };
  const { halfWidth: W, halfLength: L } = COURT;
  line(0.08, L * 2, -W, 0); line(0.08, L * 2, W, 0);
  line(W * 2, 0.08, 0, -L); line(W * 2, 0.08, 0, L);
  line(W * 2, 0.08, 0, -6.4); line(W * 2, 0.08, 0, 6.4);
  line(0.08, 12.8, 0, 0);

  const net = new THREE.Mesh(
    new THREE.BoxGeometry(W * 2 + 1, COURT.netHeight, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.6 })
  );
  net.position.y = COURT.netHeight / 2;
  scene.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 1, 0.06, 0.07), lineMat);
  tape.position.y = COURT.netHeight;
  scene.add(tape);
}

// A simple Mii-like character: round head, capsule body, racket arm.
export function makePlayer(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color });
  const skin = new THREE.MeshStandardMaterial({ color: 0xffd7b0 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.6, 8, 16), mat);
  body.position.y = 0.8;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), skin);
  head.position.y = 1.65;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const x of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eye.position.set(x, 1.7, -0.32);
    g.add(eye);
  }

  const arm = new THREE.Group();
  arm.position.set(0.4, 1.1, 0);
  const racket = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  racket.position.set(0.55, 0, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4), skin);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.2, 0, 0);
  arm.add(racket, handle);

  g.add(body, head, arm);
  g.userData.arm = arm;
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
