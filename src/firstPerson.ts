import * as THREE from "three";
// import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { generateMesh } from "./meshGenerator";
import { CHUNK_SIZE, storageKeys } from "./constants";
import { disposeNode } from "./disposeNode";
import { editNoiseMapChunks } from "./noiseMapEditor";
import { LoadedChunks, NoiseLayers, WorkerReturnMessage } from "./types";
import { getChunkKey, getSeed } from "./utils";
// import { JoystickControls } from "three-joystick";
import MobileController from "./mobileController";
import Worker from "web-worker";
import Stats from "stats.js";

/* ============ VARIABLES ============ */

const LOAD_CHUNK_RADIUS = 2;

const interpolate = sessionStorage.getItem(storageKeys.INTERPOLATE) === "true";
const wireframe = sessionStorage.getItem(storageKeys.WIREFRAME) === "true";

let isMobile = false;

if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  isMobile = true;
}

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
camera.position.y = 50;

// Scene
const scene = new THREE.Scene();

// Stats
const stats = new Stats();
stats.showPanel(0);
stats.dom.style.left = "";
stats.dom.style.right = "0";
document.body.appendChild(stats.dom);

/* ============ SKYBOX ============ */

const skyboxPaths = [
  "skybox/front.png",
  "skybox/back.png",
  "skybox/top.png",
  "skybox/bottom.png",
  "skybox/left.png",
  "skybox/right.png",
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

// const modal = document.getElementById("modal");
// const topBar = document.getElementById("top-bar");

// new PointerLockControls(camera, document.body);

// window.addEventListener("click", () => {
//   document.body.requestPointerLock();
// });

// document.addEventListener("pointerlockchange", () => {
//   if (modal) {
//     if (document.pointerLockElement === document.body) {
//       modal.style.display = "none";
//       if (topBar) topBar.style.display = "flex";
//     } else {
//       modal.style.display = "grid";
//       if (topBar) topBar.style.display = "none";
//     }
//   }
// });

// const joystickControls = new JoystickControls(camera, scene);

/* ============ MOBILE CONTROLS ============ */

// let xycontrollerLook: MobileController;
// let xycontrollerMove: MobileController;

let cameraRotationXZOffset = 0;
let cameraRotationYOffset = 0;
let cameraMoveX = 0;
let cameraMoveY = 0;

// const radius = 4;

const onXYControllerLook = (value: THREE.Vector2) => {
  console.log("LOOK", value);
  cameraRotationXZOffset -= value.x * 0.1;
  cameraRotationYOffset += value.y * 0.1;
  cameraRotationYOffset = Math.max(Math.min(cameraRotationYOffset, 2.5), -2.5);
};

const onXYControllerMove = (value: THREE.Vector2) => {
  // console.log("MOVE", value);
  const tmpVec = [0, 0];
  if (value.y > 0) {
    //w
    tmpVec[0] += Math.cos(cameraRotationXZOffset) * 0.75;
    tmpVec[1] -= Math.sin(cameraRotationXZOffset) * 0.75;
  }
  if (value.y < 0) {
    //s
    tmpVec[0] -= Math.cos(cameraRotationXZOffset) * 0.75;
    tmpVec[1] += Math.sin(cameraRotationXZOffset) * 0.75;
  }
  if (value.x > 0) {
    //a
    tmpVec[0] += Math.sin(cameraRotationXZOffset) * 0.75;
    tmpVec[1] += Math.cos(cameraRotationXZOffset) * 0.75;
  }
  if (value.x < 0) {
    //d
    tmpVec[0] -= Math.sin(cameraRotationXZOffset) * 0.75;
    tmpVec[1] -= Math.cos(cameraRotationXZOffset) * 0.75;
  }
  cameraMoveX = tmpVec[0];
  cameraMoveY = tmpVec[1];
};

if (isMobile) {
  // xycontrollerLook =
  new MobileController(
    document.getElementById("XYControllerLook") as HTMLCanvasElement,
    onXYControllerLook
  );
  // xycontrollerMove =
  new MobileController(
    document.getElementById("XYControllerMove") as HTMLCanvasElement,
    onXYControllerMove
  );
}

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
const frontRaycaster = new THREE.Raycaster(
  camera.position.add(new THREE.Vector3(0, 10, 0)),
  new THREE.Vector3(1, 0, 0)
);
const backRaycaster = new THREE.Raycaster(
  camera.position.add(new THREE.Vector3(0, 10, 0)),
  new THREE.Vector3(-1, 0, 0)
);
const leftRaycaster = new THREE.Raycaster(
  camera.position.add(new THREE.Vector3(0, 10, 0)),
  new THREE.Vector3(0, 0, 1)
);
const rightRaycaster = new THREE.Raycaster(
  camera.position.add(new THREE.Vector3(0, 10, 0)),
  new THREE.Vector3(0, 0, -1)
);

const checkIntersects = (
  raycaster: THREE.Raycaster,
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshNormalMaterial>,
  distance: number
) => {
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length) {
    if (intersects[0].distance <= distance) {
      return true;
    }
  }
  return false;
};

function move() {
  const chunkX = Math.floor((camera.position.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
  const chunkZ = Math.floor((camera.position.z + CHUNK_SIZE / 2) / CHUNK_SIZE);

  const groundMesh = loadedChunks[getChunkKey(chunkX, chunkZ)].mesh;

  const normalizedCameraDir = new THREE.Vector2(
    cameraDir.x,
    cameraDir.z
  ).normalize();
  let moveX = normalizedCameraDir.x * MOVE_SPEED;
  let moveZ = normalizedCameraDir.y * MOVE_SPEED;

  if (groundMesh) {
    if (!isMobile) {
      const frontIntersects = checkIntersects(frontRaycaster, groundMesh, 3);
      const backIntersects = checkIntersects(backRaycaster, groundMesh, 3);
      const leftIntersects = checkIntersects(leftRaycaster, groundMesh, 3);
      const rightIntersects = checkIntersects(rightRaycaster, groundMesh, 3);
      if (frontIntersects && moveX > 0) moveX = 0;
      if (backIntersects && moveX < 0) moveX = 0;
      if (leftIntersects && moveZ > 0) moveZ = 0;
      if (rightIntersects && moveZ < 0) moveZ = 0;

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
    }
  }

  if (jump && grounded) {
    yVelocity -= JUMP_VELOCITY;
    camera.position.y -= yVelocity;
    grounded = false;
  } else {
    try {
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
              grounded = true;
            } else {
              camera.position.y -= yVelocity;
              grounded = false;
            }
            if (yVelocity < MAX_Y_VELOCITY) {
              yVelocity += GRAVITY;
            } else {
              yVelocity = MAX_Y_VELOCITY;
            }
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

  // joystickControls.update((movement) => {
  //   if (movement) {
  //     /**
  //      * The values reported back might be too large for your scene.
  //      * In that case you will need to control the sensitivity.
  //      */
  //     const sensitivity = 0.002;

  //     /**
  //      * Do something with the values, for example changing the position
  //      * of the object
  //      */
  //     camera.position.x += movement.moveX * sensitivity;
  //     camera.position.z += movement.moveY * sensitivity;
  //   }
  // });

  if (isMobile) {
    // console.log(
    //   Math.cos(cameraRotationXZOffset),
    //   Math.atan(cameraRotationYOffset),
    //   Math.sin(cameraRotationXZOffset)
    // );
    // camera.position.set(
    //   camera.position.x + radius * Math.cos(cameraRotationXZOffset),
    //   camera.position.y + radius * Math.atan(cameraRotationYOffset),
    //   camera.position.z + radius * Math.sin(cameraRotationXZOffset)
    // );
    camera.position.x += cameraMoveX;
    camera.position.z += cameraMoveY;
    // camera.lookAt(
    //   camera.position.x,
    //   camera.position.y + 1.5,
    //   camera.position.z
    // );
  }
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
