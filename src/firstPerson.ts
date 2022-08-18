import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { generateMesh } from "./meshGenerator";
import { CHUNK_SIZE, storageKeys } from "./constants";
import { disposeNode } from "./disposeNode";
import { editNoiseMapChunks } from "./noiseMapEditor";
import { LoadedChunks, NoiseLayers, WorkerReturnMessage } from "./types";
import { getChunkKey, getSeed } from "./utils";
import Worker from "web-worker";
import Stats from "stats.js";

/* ============ VARIABLES ============ */

const LOAD_CHUNK_RADIUS = 2;

const interpolate = sessionStorage.getItem(storageKeys.INTERPOLATE) === "true";
const wireframe = sessionStorage.getItem(storageKeys.WIREFRAME) === "true";

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
camera.position.y = 50;

// Scene
const scene = new THREE.Scene();

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

// Stats
const stats = new Stats();
stats.showPanel(0);
stats.dom.style.left = "";
stats.dom.style.right = "0";
document.body.appendChild(stats.dom);

/* ============ CONTROLS ============ */

const modal = document.getElementById("modal");
const topBar = document.getElementById("top-bar");

new PointerLockControls(camera, document.body);

window.addEventListener("click", () => {
  document.body.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  if (modal) {
    if (document.pointerLockElement === document.body) {
      modal.style.display = "none";
      if (topBar) topBar.style.display = "flex";
    } else {
      modal.style.display = "grid";
      if (topBar) topBar.style.display = "none";
    }
  }
});

/* ============ GENERATE WORLD ============ */

let seed = getSeed();

let loadedChunks: LoadedChunks = {};

let noiseLayersStr = sessionStorage.getItem(storageKeys.NOISE_LAYERS);
let noiseLayers = noiseLayersStr
  ? (noiseLayersStr.split(",").map((layer) => parseInt(layer)) as NoiseLayers)
  : null;

for (let x = -1; x < 2; x++) {
  for (let z = -1; z < 2; z++) {
    let mesh = null;
    if (noiseLayers) {
      mesh = generateMesh(x, 0, z, { noiseLayers, seed });
    } else {
      mesh = generateMesh(x, 0, z, { seed });
    }
    scene.add(mesh);
    loadedChunks[getChunkKey(x, z)] = { mesh, noiseMap: null };
  }
}

/* ============ WORKER POOL ============ */

const NUM_WORKERS = 3;
const workerPool: Worker[] = [];

for (let w = 0; w < NUM_WORKERS; w++) {
  const worker = new Worker(new URL("./worker.mts", import.meta.url), {
    type: "module",
  });

  worker.addEventListener("message", (e: MessageEvent<WorkerReturnMessage>) => {
    let mesh = new THREE.ObjectLoader().parse(e.data[2]) as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshNormalMaterial
    >;
    scene.add(mesh);
    loadedChunks[getChunkKey(e.data[0], e.data[1])] = {
      mesh,
      noiseMap: null,
    };
  });

  workerPool.push(worker);
}

/* ============ MOVEMENT ============ */

const MOVE_SPEED = 0.8;
const JUMP_VELOCITY = 1.5;
const MAX_Y_VELOCITY = 1.5;
const GRAVITY = 0.03;

let yVelocity = 0;
let grounded = false;
let jump = false;

// [up, down, left, right]
const keys = [false, false, false, false];

const cameraDir = new THREE.Vector3();

const groundRaycaster = new THREE.Raycaster(
  camera.position,
  new THREE.Vector3(0, -1, 0)
);

function move() {
  const chunkX = Math.floor((camera.position.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
  const chunkZ = Math.floor((camera.position.z + CHUNK_SIZE / 2) / CHUNK_SIZE);

  const normalizedCameraDir = new THREE.Vector2(
    cameraDir.x,
    cameraDir.z
  ).normalize();
  const moveX = normalizedCameraDir.x * MOVE_SPEED;
  const moveZ = normalizedCameraDir.y * MOVE_SPEED;

  if (keys[0]) {
    camera.position.x += moveX;
    camera.position.z += moveZ;
  }
  if (keys[1]) {
    camera.position.x -= moveX;
    camera.position.z -= moveZ;
  }
  if (keys[2]) {
    camera.position.x += moveZ;
    camera.position.z -= moveX;
  }
  if (keys[3]) {
    camera.position.x -= moveZ;
    camera.position.z += moveX;
  }

  if (jump && grounded) {
    yVelocity -= JUMP_VELOCITY;
    camera.position.y -= yVelocity;
    grounded = false;
  } else {
    try {
      const groundMesh = loadedChunks[getChunkKey(chunkX, chunkZ)].mesh;
      if (groundMesh) {
        const intersects = groundRaycaster.intersectObject(groundMesh);
        if (intersects.length) {
          const distance = intersects[0].distance;
          if (distance <= 10) {
            camera.position.y += 10 - distance;
            yVelocity = 0;
            grounded = true;
          } else {
            if (distance - yVelocity < 10) {
              camera.position.y -= distance - 10;
            } else {
              camera.position.y -= yVelocity;
            }
            if (yVelocity < MAX_Y_VELOCITY) {
              yVelocity += GRAVITY;
            } else {
              yVelocity = MAX_Y_VELOCITY;
            }
            grounded = false;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  let workerIndex = 0;
  for (
    let z = chunkZ - LOAD_CHUNK_RADIUS;
    z <= chunkZ + LOAD_CHUNK_RADIUS;
    z++
  ) {
    for (
      let x = chunkX - LOAD_CHUNK_RADIUS;
      x <= chunkX + LOAD_CHUNK_RADIUS;
      x++
    ) {
      let chunkKey = getChunkKey(x, z);
      if (!(chunkKey in loadedChunks)) {
        loadedChunks[chunkKey] = { mesh: null, noiseMap: null };
        workerPool[workerIndex].postMessage([
          x,
          z,
          noiseLayers,
          seed,
          interpolate,
          wireframe,
        ]);
        workerIndex = (workerIndex + 1) % NUM_WORKERS;
      }
    }
  }
}

/* ============ EDIT TERRAIN ============ */

const raycaster = new THREE.Raycaster();

const mouse = [false, false];

function editTerrain() {
  if (mouse[0] || mouse[1]) {
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length) {
      const editChunks = editNoiseMapChunks(
        loadedChunks,
        intersects[0].point,
        !mouse[0] && mouse[1],
        noiseLayers,
        seed
      );
      editChunks.forEach((chunk) => {
        const chunkKey = getChunkKey(chunk[0], chunk[1]);
        const { mesh: oldMesh, noiseMap } = loadedChunks[chunkKey];

        disposeNode(scene, oldMesh);
        const mesh = generateMesh(chunk[0], 0, chunk[1], { noiseMap });
        loadedChunks[chunkKey].mesh = mesh;

        scene.add(mesh);
      });
    }
  }
}

/* ============ ANIMATION ============ */

function animation(_time: number) {
  stats.begin();

  camera.getWorldDirection(cameraDir);
  raycaster.set(camera.position, cameraDir);

  move();
  editTerrain();

  stats.end();
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

/* ============ KEY LISTENERS ============ */

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      keys[0] = true;
      break;
    case "ArrowDown":
    case "KeyS":
      keys[1] = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      keys[2] = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keys[3] = true;
      break;
    case "Space":
      jump = true;
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "ArrowUp":
    case "KeyW":
      keys[0] = false;
      break;
    case "ArrowDown":
    case "KeyS":
      keys[1] = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      keys[2] = false;
      break;
    case "ArrowRight":
    case "KeyD":
      keys[3] = false;
      break;
    case "Space":
      jump = false;
      break;
  }
});

/* ============ MISC EVENT LISTENERS ============ */

window.addEventListener("resize", function () {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
