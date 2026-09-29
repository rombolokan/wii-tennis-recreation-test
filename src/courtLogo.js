import * as THREE from 'three';
import { COURT } from './scene.js';

// Base44 logo painted on the court surround behind each baseline.
// Each one reads upright from the camera behind that end.
function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#ff6b2c';
  g.beginPath(); g.arc(160, 160, 120, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(160, 160, 52, 0, Math.PI * 2); g.fill();
  g.font = '800 170px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Base44', 310, 170);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function addCourtLogos(scene) {
  const mat = new THREE.MeshStandardMaterial({ map: logoTexture(), transparent: true, roughness: 0.9 });
  [-1, 1].forEach((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.8), mat);
    m.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
    m.position.set(0, 0.004, s * (COURT.halfLength + 1.7));
    m.receiveShadow = true;
    scene.add(m);
  });
}
