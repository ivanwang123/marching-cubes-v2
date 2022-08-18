import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { generateMesh } from "./meshGenerator";
import { DEFAULT_NOISE_LAYERS, storageKeys } from "./constants";
import { disposeNode } from "./disposeNode";
import { generateNoiseMap } from "./noiseMapGenerator";
import { LoadedChunks, NoiseLayers } from "./types";
import { getChunkKey, getSeed } from "./utils";

/* ============ VARIABLES ============ */

const MAP_SIZE = 1;

let interpolateStr = sessionStorage.getItem(storageKeys.INTERPOLATE);
let interpolate = interpolateStr === null ? true : interpolateStr === "true";
let wireframe = sessionStorage.getItem(storageKeys.WIREFRAME) === "true";

/* ============ SETUP ============ */

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("app") as HTMLCanvasElement,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animation);
document.body.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  1,
  20000
);
camera.position.y = 90;
camera.position.z = 45;
camera.position.x = 45;

// Scene
const scene = new THREE.Scene();

/* ============ SKYBOX ============ */

const skyboxPaths = [
  "public/skybox/front.png",
  "public/skybox/back.png",
  "public/skybox/top.png",
  "public/skybox/bottom.png",
  "public/skybox/left.png",
  "public/skybox/right.png",
];

const materialArray = skyboxPaths.map((path) => {
  const texture = new THREE.TextureLoader().load(path);
  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
  });
});
const skyboxGeom = new THREE.BoxGeometry(10000, 10000, 10000);
const skybox = new THREE.Mesh(skyboxGeom, materialArray);
scene.add(skybox);

/* ============ CONTROLS ============ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 10, 0);
controls.update();

/* ============ MESH GENERATOR ============ */

let loadedChunks: LoadedChunks = {};

let seed = getSeed();

let noiseLayersStr = sessionStorage.getItem(storageKeys.NOISE_LAYERS);
let noiseLayers: NoiseLayers = [50, 25, 10];

if (noiseLayersStr) {
  noiseLayers = noiseLayersStr
    .split(",")
    .map((layer) => parseInt(layer)) as NoiseLayers;
}

function generateMap() {
  for (let z = -MAP_SIZE / 2; z <= MAP_SIZE / 2; z++) {
    for (let x = -MAP_SIZE / 2; x <= MAP_SIZE / 2; x++) {
      if (getChunkKey(x, z) in loadedChunks) {
        loadedChunks[getChunkKey(x, z)].noiseMap = generateNoiseMap(
          x,
          0,
          z,
          noiseLayers,
          seed,
          true
        );
      } else {
        loadedChunks[getChunkKey(x, z)] = {
          noiseMap: generateNoiseMap(x, 0, z, noiseLayers, seed, true),
          mesh: null,
        };
      }
    }
  }

  for (let z = -MAP_SIZE / 2; z <= MAP_SIZE / 2; z++) {
    for (let x = -MAP_SIZE / 2; x <= MAP_SIZE / 2; x++) {
      const { mesh: oldMesh, noiseMap } = loadedChunks[getChunkKey(x, z)];

      if (oldMesh) {
        disposeNode(scene, oldMesh);
      }

      const mesh = generateMesh(x, 0, z, { noiseMap }, interpolate, wireframe);
      loadedChunks[getChunkKey(x, z)].mesh = mesh;
      scene.add(mesh);
    }
  }
}

generateMap();

/* ============ SEED ============ */

const currentSeed = document.getElementById(
  "current-seed"
) as HTMLParagraphElement;
const changeSeedBtn = document.getElementById("change-seed-btn");

currentSeed.textContent = seed.toFixed(7).toString();

changeSeedBtn?.addEventListener("click", () => {
  seed = Math.random();
  currentSeed.textContent = seed.toFixed(7).toString();
  generateMap();
});

/* ============ OPTION TOGGLES ============ */

const interpolationToggle = document.getElementById(
  "interpolation-toggle"
) as HTMLInputElement;
const wireframeToggle = document.getElementById(
  "wireframe-toggle"
) as HTMLInputElement;

interpolationToggle.checked = interpolate;
wireframeToggle.checked = wireframe;
sessionStorage.setItem(
  storageKeys.INTERPOLATE,
  new Boolean(interpolate).toString()
);
sessionStorage.setItem(
  storageKeys.WIREFRAME,
  new Boolean(wireframe).toString()
);

interpolationToggle.addEventListener("click", (e) => {
  interpolate = (e.target as HTMLInputElement).checked;
  sessionStorage.setItem(
    storageKeys.INTERPOLATE,
    new Boolean(interpolate).toString()
  );
  generateMap();
});

wireframeToggle.addEventListener("click", (e) => {
  wireframe = (e.target as HTMLInputElement).checked;
  sessionStorage.setItem(
    storageKeys.WIREFRAME,
    new Boolean(wireframe).toString()
  );
  Object.values(loadedChunks).forEach((chunk) => {
    if (chunk.mesh) chunk.mesh.material.wireframe = wireframe;
  });
});

/* ============ NOISE SLIDERS ============ */

const noiseSliderOne = document.getElementById(
  "noise-slider-one"
) as HTMLInputElement;
const noiseSliderTwo = document.getElementById(
  "noise-slider-two"
) as HTMLInputElement;
const noiseSliderThree = document.getElementById(
  "noise-slider-three"
) as HTMLInputElement;
const resetNoiseBtn = document.getElementById("reset-noise-btn");

noiseSliderOne.value = noiseLayers[0].toString();
noiseSliderTwo.value = noiseLayers[1].toString();
noiseSliderThree.value = noiseLayers[2].toString();

noiseSliderOne.addEventListener("input", (e: any) => {
  noiseLayers[0] = parseInt(e.target.value);
  generateMap();
});

noiseSliderTwo.addEventListener("input", (e: any) => {
  noiseLayers[1] = parseInt(e.target.value);
  generateMap();
});

noiseSliderThree.addEventListener("input", (e: any) => {
  noiseLayers[2] = parseInt(e.target.value);
  generateMap();
});

resetNoiseBtn?.addEventListener("click", () => {
  noiseLayers = [...DEFAULT_NOISE_LAYERS];
  noiseSliderOne.value = noiseLayers[0].toString();
  noiseSliderTwo.value = noiseLayers[1].toString();
  noiseSliderThree.value = noiseLayers[2].toString();
  generateMap();
});

/* ============ SAVE & RESET ============ */

const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");

saveBtn?.addEventListener("click", () => {
  sessionStorage.setItem(storageKeys.NOISE_LAYERS, noiseLayers.toString());
  sessionStorage.setItem(storageKeys.MAP_SEED, seed.toString());
});

resetBtn?.addEventListener("click", () => {
  controls.reset();
  controls.target = new THREE.Vector3(0, 10, 0);
  controls.update();
});

/* ============ ANIMATION ============ */

function animation(_time: number) {
  renderer.render(scene, camera);
}

/* ============ MISC EVENT LISTENERS ============ */

window.addEventListener("resize", () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

document.addEventListener("contextmenu", (e) => e.preventDefault());
