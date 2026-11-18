import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { buildWorld, buildMask } from "./world.js";

const msg = document.getElementById("msg");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
camera.position.set(0, 1.2, 7);
camera.lookAt(0, 1.4, 0);
const tickWorld = buildWorld(scene);

const lookTarget = new THREE.Object3D();
scene.add(lookTarget);
let actor = buildMask();
scene.add(actor);
let vrm = null;
const pointer = new THREE.Vector2();

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

function setActor(next, loaded) {
  scene.remove(actor);
  if (vrm) VRMUtils.deepDispose(vrm.scene);
  vrm = loaded ?? null;
  actor = next;
  scene.add(actor);
}

async function loadVrm(url) {
  msg.textContent = "Carregando…";
  try {
    const gltf = await loader.loadAsync(url);
    const model = gltf.userData.vrm;
    if (!model) throw new Error("o arquivo não é um VRM");
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.rotateVRM0(model);
    model.scene.position.y = -1.2;
    if (model.lookAt) model.lookAt.target = lookTarget;
    setActor(model.scene, model);
    msg.textContent = "VRM carregado.";
  } catch (err) {
    msg.textContent = `Falha ao carregar: ${err.message}`;
  }
}

const param = new URLSearchParams(location.search).get("vrm");
if (param) loadVrm(param);

const fromFile = (file) => {
  if (!file || !file.name.toLowerCase().endsWith(".vrm")) return void (msg.textContent = "Escolha um arquivo .vrm.");
  const url = URL.createObjectURL(file);
  loadVrm(url).finally(() => URL.revokeObjectURL(url));
};
document.getElementById("file").addEventListener("change", (e) => fromFile(e.target.files[0]));
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => { e.preventDefault(); fromFile(e.dataTransfer.files[0]); });
addEventListener("pointermove", (e) => pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));

// Cero: additive red beam that grows then fades.
const beams = [];
addEventListener("pointerdown", (e) => {
  if (e.target.closest("#hud")) return;
  const mat = new THREE.MeshBasicMaterial({ color: 0xe0455a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 30, 16), mat);
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 1.2, -15);
  scene.add(beam);
  beams.push({ beam, age: 0 });
});

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = new THREE.Clock();
let nextBlink = 2;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  if (!reduce) tickWorld(t, dt);

  lookTarget.position.set(pointer.x * 2, 1.4 + pointer.y, 3);
  if (vrm) {
    const chest = vrm.humanoid.getNormalizedBoneNode("chest");
    if (chest && !reduce) chest.rotation.x = Math.sin(t * 1.6) * 0.02;
    if (!reduce && t > nextBlink) {
      vrm.expressionManager?.setValue("blink", 1);
      setTimeout(() => vrm?.expressionManager?.setValue("blink", 0), 120);
      nextBlink = t + 2 + Math.random() * 3;
    }
    vrm.update(dt);
  } else if (!reduce) {
    actor.rotation.y = pointer.x * 0.5;
    actor.position.y = 0.6 + Math.sin(t * 1.4) * 0.05;
  }

  for (const b of beams) {
    b.age += dt;
    b.beam.material.opacity = Math.max(0, 0.9 - b.age * 1.5);
    b.beam.scale.set(1 + b.age * 2, 1, 1 + b.age * 2);
  }
  while (beams[0] && beams[0].age > 0.7) {
    const old = beams.shift();
    scene.remove(old.beam);
    old.beam.geometry.dispose();
    old.beam.material.dispose();
  }
  renderer.render(scene, camera);
});
