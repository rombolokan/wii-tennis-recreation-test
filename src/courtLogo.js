import * as THREE from 'three';
import { COURT } from './scene.js';

// Base44 logo painted on the court surround behind each baseline.
// Each one reads upright from the camera behind that end.
// The source image has a white background, so we crop to the logo and make white transparent.
function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    const g = c.getContext('2d');
    const sy = img.height * 0.34, sh = img.height * 0.32; // the logo band of the image
    g.drawImage(img, 0, sy, img.width, sh, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const min = Math.min(d.data[i], d.data[i + 1], d.data[i + 2]);
      d.data[i + 3] = Math.min(d.data[i + 3], (255 - min) * 3); // white → transparent, soft edges
    }
    g.putImageData(d, 0, 0);
    tex.needsUpdate = true;
  };
  img.src = '/base44-logo.png';
  return tex;
}

export function addCourtLogos(scene) {
  const mat = new THREE.MeshStandardMaterial({ map: logoTexture(), transparent: true, roughness: 0.9 });
  [-1, 1].forEach((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), mat);
    m.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI);
    m.position.set(0, 0.004, s * (COURT.halfLength + 1.7));
    m.receiveShadow = true;
    scene.add(m);
  });
}
