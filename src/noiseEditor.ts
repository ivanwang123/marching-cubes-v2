import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { generateChunk } from "./chunkGenerator";
import { CHUNK_SIZE, storageKeys } from "./constants";
import { disposeNode } from "./disposeNode";
import { generateNoiseMap } from "./noiseMapGenerator";
import { LoadedChunks, NoiseLayers } from "./types";
import { getChunkKey, getSeed } from "./utils";

/* ============ SETUP ============ */

const MAP_SIZE = 2;

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
  1000
);
camera.position.y = MAP_SIZE * CHUNK_SIZE * 2;
camera.position.z = MAP_SIZE * CHUNK_SIZE;
camera.position.x = MAP_SIZE * CHUNK_SIZE;

// Scene
const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);

// Axes helper
const axesHelper = new THREE.AxesHelper(5);
axesHelper.setColors(
  new THREE.Color(0xff0000),
  new THREE.Color(0x00ff00),
  new THREE.Color(0x0000ff)
);
scene.add(axesHelper);

/* ============ CONTROls ============ */

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

      const mesh = generateChunk(x, 0, z, { noiseMap });
      loadedChunks[getChunkKey(x, z)].mesh = mesh;
      scene.add(mesh);
    }
  }
}

generateMap();

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
