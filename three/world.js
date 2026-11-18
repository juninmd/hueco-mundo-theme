import * as THREE from "three";

// Desert night: dunes, crescent moon, drifting sand and a Las Noches wall.
export function buildWorld(scene) {
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.FogExp2(0x0b1220, 0.012);

  scene.add(new THREE.HemisphereLight(0x9ec4ff, 0x10151d, 0.9));
  const moonLight = new THREE.DirectionalLight(0xdfeaff, 2.2);
  moonLight.position.set(-4, 6, -6);
  scene.add(moonLight);

  const dunes = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120, 120, 120),
    new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 1 }),
  );
  dunes.rotation.x = -Math.PI / 2;
  const pos = dunes.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.18) * Math.cos(y * 0.13) * 1.4 + Math.sin(x * 0.05 + y * 0.07) * 2.2);
  }
  dunes.geometry.computeVertexNormals();
  dunes.position.y = -1.2;
  scene.add(dunes);

  const moon = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshBasicMaterial({ color: 0xeaf3ff, fog: false }));
  const cut = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.MeshBasicMaterial({ color: 0x05070c, fog: false }));
  cut.position.set(1.3, 0.4, 0.01);
  moon.add(cut);
  moon.position.set(-14, 11, -45);
  scene.add(moon);

  const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 5, 1), new THREE.MeshStandardMaterial({ color: 0xcfd9e6, roughness: 0.9 }));
  wall.position.set(0, 1.3, -38);
  scene.add(wall);

  const N = 600;
  const sand = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    sand[i * 3] = (Math.random() - 0.5) * 40;
    sand[i * 3 + 1] = Math.random() * 6 - 1;
    sand[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(sand, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaebdd0, size: 0.04, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  return (t, dt) => {
    for (let i = 0; i < N; i++) {
      sand[i * 3] += dt * 0.6;
      if (sand[i * 3] > 20) sand[i * 3] = -20;
      sand[i * 3 + 1] += Math.sin(t + i) * dt * 0.05;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// Placeholder Hollow mask when no VRM is loaded.
export function buildMask() {
  const g = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.5 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), bone);
  skull.scale.set(1, 1.2, 0.9);
  g.add(skull);
  const dark = new THREE.MeshBasicMaterial({ color: 0x05070c });
  for (const x of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), dark);
    eye.scale.set(1, 1.4, 0.5);
    eye.position.set(x, 0.1, 0.42);
    g.add(eye);
  }
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.02), new THREE.MeshBasicMaterial({ color: 0xe0455a }));
  mark.position.set(0.18, -0.15, 0.45);
  g.add(mark);
  g.position.y = 0.6;
  return g;
}
