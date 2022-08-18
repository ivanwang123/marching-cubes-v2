import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { storageKeys } from "./constants";
import { disposeNode } from "./disposeNode";
import { generateMesh } from "./meshGenerator";
import { generateNoiseMap } from "./noiseMapGenerator";
import { LoadedChunks, NoiseLayers } from "./types";
import { getChunkKey, getSeed } from "./utils";

/* ============ SETUP ============ */

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("app") as HTMLCanvasElement,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animation);
const canvasContainer = document.getElementById("canvas-container");
canvasContainer?.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.y = 90;
camera.position.x = 60;
camera.position.z = 60;

// Scene
const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

/* ============ CONTROLS ============ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 0, 0);
controls.autoRotate = true;
controls.update();

/* ============ MESH GENERATOR ============ */

const MAP_SIZE = 2;

let loadedChunks: LoadedChunks = {};

let seed = Math.random();

let noiseLayers: NoiseLayers = [50, 25, 10];

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
          false
        );
      } else {
        loadedChunks[getChunkKey(x, z)] = {
          noiseMap: generateNoiseMap(x, 0, z, noiseLayers, seed, false),
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

      const mesh = generateMesh(x, 0, z, { noiseMap }, true, false);
      loadedChunks[getChunkKey(x, z)].mesh = mesh;
      scene.add(mesh);
    }
  }
}

generateMap();

/* ============ ANIMATION ============ */

function animation(_time: number) {
  controls.update();
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
