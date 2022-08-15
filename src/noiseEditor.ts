import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { generateChunk } from "./chunkGenerator";
import { generateNoiseMap } from "./noiseMapGenerator";
import { disposeNode } from "./disposeNode";
import { editNoiseMap } from "./noiseMapEditor";
import { CHUNK_SIZE, CHUNK_HEIGHT, storageKeys } from "./constants";
import { LoadedChunks, NoiseMap } from "./types";
import { getChunkKey } from "./utils";

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
  1000
);
camera.position.y = CHUNK_SIZE / 2 - 5;
camera.position.z = CHUNK_SIZE;
camera.position.x = CHUNK_SIZE;

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
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = true;
controls.target = new THREE.Vector3(0, CHUNK_SIZE / 2 - 5, 0);
controls.update();

let enableControls = false;

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    controls.enableRotate = true;
    enableControls = true;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    controls.enableRotate = false;
    enableControls = false;
  }
});

/* ============ MESH GENERATOR ============ */

const MAP_WIDTH = 2;
const MAP_LENGTH = 2;

let loadedChunks: LoadedChunks = {};

let noiseMapStr = sessionStorage.getItem(storageKeys.NOISE_MAP);

let noiseLayersStr = sessionStorage.getItem(storageKeys.NOISE_LAYERS);
let noiseLayers = [50, 25, 10];

if (noiseLayersStr) {
  noiseLayers = noiseLayersStr.split(",").map((layer) => parseInt(layer));
}

function generateMap(useSessionStorage: boolean = false) {
  // Retrieve noise map from session storage if it exists
  // Otherwise generate new noise map
  if (useSessionStorage && noiseMapStr) {
    // let noiseValues = noiseMapStr.split(",");
    // let mapSize = CHUNK_SIZE + 1;
    // let mapHeight = CHUNK_HEIGHT + 1;
    // for (let y = 0; y < mapHeight; y++) {
    //   let plane = [];
    //   for (let z = 0; z < mapSize; z++) {
    //     // let line = [];
    //     const buffer = new ArrayBuffer(mapSize * 4);
    //     const line = new Float32Array(buffer);
    //     for (let x = 0; x < mapSize; x++) {
    //       line[x] = parseFloat(
    //         noiseValues[y * mapSize * mapSize + z * mapSize + x]
    //       );
    //     }
    //     plane.push(line);
    //   }
    //   noiseMap.push(plane);
    // }
  } else {
    for (let z = -MAP_LENGTH / 2; z <= MAP_LENGTH / 2; z++) {
      for (let x = -MAP_LENGTH / 2; x <= MAP_WIDTH / 2; x++) {
        if (getChunkKey(x, z) in loadedChunks) {
          loadedChunks[getChunkKey(x, z)].noiseMap = generateNoiseMap(
            x,
            0,
            z,
            noiseLayers,
            true
          );
        } else {
          loadedChunks[getChunkKey(x, z)] = {
            noiseMap: generateNoiseMap(x, 0, z, noiseLayers, true),
            mesh: null,
          };
        }
      }
    }
  }

  for (let z = -MAP_LENGTH / 2; z <= MAP_LENGTH / 2; z++) {
    for (let x = -MAP_WIDTH / 2; x <= MAP_WIDTH / 2; x++) {
      const { mesh: oldMesh, noiseMap } = loadedChunks[getChunkKey(x, z)];

      if (oldMesh) {
        disposeNode(scene, oldMesh);
      }

      const mesh = generateChunk(x, 0, z, noiseMap);
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
  sessionStorage.setItem(storageKeys.NOISE_MAP, noiseMap.toString());
  sessionStorage.setItem(storageKeys.NOISE_LAYERS, noiseLayers.toString());
});

resetBtn?.addEventListener("click", () => {
  controls.reset();
});

/* ============ ANIMATION & UPDATE ============ */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const mouse = [false, false];

// function update() {
//   if (!enableControls && (mouse[0] || mouse[1])) {
//     const intersects = raycaster.intersectObjects(scene.children);
//     if (intersects.length) {
//       noiseMap = editNoiseMap(
//         noiseMap,
//         intersects[0].point,
//         chunkX,
//         chunkY,
//         chunkZ,
//         !mouse[0] && mouse[1]
//       );
//       mesh = generateChunk(chunkX, chunkY, chunkZ, noiseMap);
//       scene.add(mesh);
//       disposeNode(scene, intersects[0].object);
//     }
//   }
// }

// TODO: Remove fps?
function animation(_time: number) {
  raycaster.setFromCamera(pointer, camera);

  // update();

  renderer.render(scene, camera);
}

/* ============ MOUSE LISTENERS ============ */

window.addEventListener("mouseup", (e) => {
  switch (e.button) {
    case 0:
      mouse[0] = false;
      break;
    case 2:
      mouse[1] = false;
      break;
  }
});

window.addEventListener("mousedown", (e) => {
  switch (e.button) {
    case 0:
      mouse[0] = true;
      break;
    case 2:
      mouse[1] = true;
      break;
  }
});

window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* ============ MISC EVENT LISTENERS ============ */

window.addEventListener("resize", () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

document.addEventListener("contextmenu", (e) => e.preventDefault());
