import * as THREE from 'three';
import { COURT } from './scene.js';

// Tel Aviv beachfront: sky, Mediterranean sea behind the far baseline, sand, palm trees,
// the city skyline along the side, and a crowd in the stands that cheers on points.
export function buildBeach(scene) {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xcfe6f5, 90, 420);

  // Sand
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0xf0d9a8, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.02;
  sand.receiveShadow = true;
  scene.add(sand);

  // Promenade stripe between sand and city
  const prom = new THREE.Mesh(new THREE.PlaneGeometry(14, 600), new THREE.MeshStandardMaterial({ color: 0xd8cfc0 }));
  prom.rotation.x = -Math.PI / 2;
  prom.position.set(40, -0.01, 0);
  scene.add(prom);

  const sea = buildSea(scene);
  buildSkyline(scene);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    palm(scene, side * (COURT.halfWidth + 13 + Math.random() * 4), -40 + i * 7);
  }
  const crowd = buildCrowd(scene);

  return {
    update(t) { sea.update(t); crowd.update(t); },
    cheer: crowd.cheer,
  };
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#3f8fdc');
  grd.addColorStop(0.6, '#9fd0f2');
  grd.addColorStop(1, '#fbe3c0');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSea(scene) {
  const geo = new THREE.PlaneGeometry(700, 300, 80, 40);
  const sea = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a8fc4, roughness: 0.25, metalness: 0.1, flatShading: true }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.8, -COURT.halfLength - 45 - 150);
  scene.add(sea);
  // Foam line where waves meet the sand
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(700, 2.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.02, -COURT.halfLength - 45);
  scene.add(foam);

  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array);
  return {
    update(t) {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        pos.setZ(i, Math.sin(x * 0.08 + t * 1.2) * 0.35 + Math.cos(y * 0.12 + t * 0.9) * 0.35);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      foam.position.z = -COURT.halfLength - 45 + Math.sin(t * 0.8) * 1.2;
      foam.material.opacity = 0.6 + Math.sin(t * 0.8) * 0.25;
    },
  };
}

// White/cream towers of the Tel Aviv shoreline, off to the right side of the court.
function buildSkyline(scene) {
  const colors = [0xf4f1ea, 0xe6e2d8, 0xdfe7ee, 0xc9d6e2, 0xf7ecd9];
  const winMat = new THREE.MeshStandardMaterial({ color: 0x6f94b8, roughness: 0.2, metalness: 0.4 });
  for (let i = 0; i < 26; i++) {
    const h = 15 + Math.random() * (i % 5 === 0 ? 85 : 35);
    const w = 8 + Math.random() * 8;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.8 }));
    const x = 55 + Math.random() * 60, z = -160 + i * 11 + Math.random() * 5;
    b.position.set(x, h / 2, z);
    scene.add(b);
    // Glass band facing the court
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.85), winMat);
    glass.position.set(x - w / 2 - 0.05, h / 2, z);
    glass.rotation.y = -Math.PI / 2;
    scene.add(glass);
  }
}

function palm(scene, x, z) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6a45 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8a3a, side: THREE.DoubleSide });
  const h = 7 + Math.random() * 3;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 8), trunkMat);
  trunk.position.y = h / 2;
  trunk.rotation.z = (Math.random() - 0.5) * 0.15;
  g.add(trunk);
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 4.2), leafMat);
    leaf.geometry.translate(0, 2.1, 0);
    leaf.position.y = h;
    leaf.rotation.set(1.1, (i / 8) * Math.PI * 2, 0, 'YXZ');
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  scene.add(g);
}

// Stands on both sides of the court with instanced spectators.
function buildCrowd(scene) {
  const rows = 6, perRow = 34;
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const standX = COURT.halfWidth + 5;
  const people = [];
  for (const side of [-1, 1]) {
    for (let r = 0; r < rows; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5 + r * 0.6, perRow * 0.9), stepMat);
      step.position.set(side * (standX + r * 1.2), (0.5 + r * 0.6) / 2, -2);
      step.receiveShadow = true;
      scene.add(step);
      for (let i = 0; i < perRow; i++) {
        if (Math.random() < 0.12) continue;
        people.push({ x: side * (standX + r * 1.2), y: 0.5 + r * 0.6, z: -2 - (perRow * 0.9) / 2 + 0.45 + i * 0.9, phase: Math.random() * 6, side });
      }
    }
  }

  const shirts = [0xff5a5a, 0x2a8cff, 0xffd23f, 0x3bc47a, 0xffffff, 0xff8fc8, 0x8a5cff, 0xff9a3c];
  const skins = [0xf2c9a0, 0xe0a878, 0xb57c52, 0x7a4e2e, 0xf7dcc0];
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 8), new THREE.MeshStandardMaterial(), people.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial(), people.length);
  const col = new THREE.Color();
  people.forEach((p, i) => {
    bodies.setColorAt(i, col.setHex(shirts[i % shirts.length]));
    heads.setColorAt(i, col.setHex(skins[(i * 7) % skins.length]));
  });
  scene.add(bodies, heads);

  let excitement = 0;
  const m = new THREE.Matrix4();
  return {
    cheer(amount = 1) { excitement = Math.max(excitement, amount); },
    update(t) {
      excitement *= 0.985;
      people.forEach((p, i) => {
        const jump = Math.max(0, Math.sin(t * 9 + p.phase)) * 0.35 * excitement + Math.sin(t * 1.5 + p.phase) * 0.02;
        m.makeTranslation(p.x, p.y + 0.42 + jump, p.z);
        bodies.setMatrixAt(i, m);
        m.makeTranslation(p.x, p.y + 0.95 + jump, p.z);
        heads.setMatrixAt(i, m);
      });
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
    },
  };
}
