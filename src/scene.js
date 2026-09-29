import * as THREE from 'three';

export const COURT = { halfWidth: 4.1, halfLength: 11.9, netHeight: 0.95 };

export function buildCourt(scene) {
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xe0c080, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d0, 2);
  sun.position.set(-15, 25, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25;
  scene.add(sun);

  // Hard court: blue playing area on a green surround, like a beachfront club court.
  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT.halfWidth * 2 + 8, COURT.halfLength * 2 + 10),
    new THREE.MeshStandardMaterial({ color: 0x3d8b6a, roughness: 0.9 })
  );
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = 0.001;
  surround.receiveShadow = true;
  scene.add(surround);
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT.halfWidth * 2, COURT.halfLength * 2),
    new THREE.MeshStandardMaterial({ color: 0x2f6fb5, roughness: 0.85 })
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.003;
  court.receiveShadow = true;
  scene.add(court);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = (w, l, x, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.006, z);
    scene.add(m);
  };
  const { halfWidth: W, halfLength: L } = COURT;
  line(0.08, L * 2, -W, 0); line(0.08, L * 2, W, 0);
  line(W * 2, 0.08, 0, -L); line(W * 2, 0.08, 0, L);
  line(W * 2, 0.08, 0, -6.4); line(W * 2, 0.08, 0, 6.4);
  line(0.08, 12.8, 0, 0);

  const net = new THREE.Mesh(
    new THREE.BoxGeometry(W * 2 + 1, COURT.netHeight, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.55 })
  );
  net.position.y = COURT.netHeight / 2;
  scene.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 1, 0.07, 0.06), lineMat);
  tape.position.y = COURT.netHeight;
  scene.add(tape);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x224433 });
  for (const x of [-W - 0.5, W + 0.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.07), postMat);
    post.position.set(x, 0.53, 0);
    scene.add(post);
  }
}

// A Mii-style character: big round head with hair and face, shirt, shorts, arms, legs, shoes.
export function makePlayer(color, { hair = 0x3a2412, skin = 0xf2c9a0 } = {}) {
  const g = new THREE.Group();
  const std = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const shirt = std(color), skinMat = std(skin), hairMat = std(hair, 0.8);
  const shorts = std(0xffffff), shoe = std(0xeeeeee), dark = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const add = (mesh, x, y, z, parent = g) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };

  // Legs + shoes
  for (const x of [-0.14, 0.14]) {
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 6, 12), skinMat), x, 0.35, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.28), shoe), x, 0.04, -0.04);
  }
  // Shorts + torso
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.25, 16), shorts), 0, 0.7, 0);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.35, 8, 16), shirt), 0, 1.05, 0);

  // Head: face points toward -z (the way the player faces).
  const head = add(new THREE.Group(), 0, 1.68, 0);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), skinMat), 0, 0, 0, head);
  const hairCap = add(new THREE.Mesh(new THREE.SphereGeometry(0.335, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat), 0, 0.02, 0.02, head);
  hairCap.rotation.x = -0.25;
  for (const x of [-0.11, 0.11]) {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })), x, 0.03, -0.28, head).scale.set(1, 1.3, 0.5);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), dark), x, 0.03, -0.305, head);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), hairMat), x, 0.12, -0.29, head);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf5a0a0, transparent: true, opacity: 0.5 })), x * 1.7, -0.07, -0.25, head).scale.set(1, 0.6, 0.3);
  }
  add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), skinMat), 0, -0.04, -0.32, head);
  const mouth = add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), dark), 0, -0.12, -0.29, head);
  mouth.rotation.z = Math.PI;
  // Headband in team color
  add(new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.025, 8, 32), shirt), 0, 0.1, 0, head).rotation.x = Math.PI / 2 - 0.2;

  // Free arm
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 6, 12), skinMat), -0.36, 1.0, 0).rotation.z = -0.2;

  // Racket arm (pivot at shoulder, racket along +x) — animated by poseArm.
  const arm = add(new THREE.Group(), 0.4, 1.1, 0);
  const upper = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.25, 6, 12), skinMat), 0.12, 0, 0, arm);
  upper.rotation.z = Math.PI / 2;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3), std(0x222222)), 0.38, 0, 0, arm).rotation.z = Math.PI / 2;
  add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), std(0xdd3322, 0.4)), 0.72, 0, 0, arm);
  const strings = add(new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })), 0.72, 0, 0, arm);
  strings.rotation.y = 0;

  g.userData.arm = arm;
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
