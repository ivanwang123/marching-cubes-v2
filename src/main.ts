import "./style.css";

import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { generateChunk } from "./chunkGenerator";

/* ======================== */

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
camera.position.y = 30;

// Scene
const scene = new THREE.Scene();

// Controls
// const controls = new OrbitControls(camera, renderer.domElement);
new PointerLockControls(camera, document.body);
// scene.add(fpsControls.getObject());
// fpsControls.lock();
document.onclick = () => {
  document.body.requestPointerLock();
};

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

// Axes helper
const axesHelper = new THREE.AxesHelper(5);
axesHelper.setColors(
  new THREE.Color(0xff0000),
  new THREE.Color(0x00ff00),
  new THREE.Color(0x0000ff)
);
scene.add(axesHelper);

/* ======================== */

const chunkSize = 50;
let chunks: THREE.Mesh[] = [];

const beforeTime = new Date().getTime();
let mesh1 = generateChunk(0, 0, 0, chunkSize);
let mesh2 = generateChunk(1, 0, 0, chunkSize);
let mesh3 = generateChunk(0, 0, 1, chunkSize);
let mesh4 = generateChunk(1, 0, 1, chunkSize);
chunks.push(mesh1);
chunks.push(mesh2);
chunks.push(mesh3);
chunks.push(mesh4);
scene.add(mesh1);
scene.add(mesh2);
scene.add(mesh3);
scene.add(mesh4);
const afterTime = new Date().getTime();
// 1 = 200
// 5 = 1600
// 10 = 2000
// 1 = 300
// 5 = 1200
console.log("DELTA", afterTime - beforeTime);

/* ======================== */

let camDir = new THREE.Vector3();
const speed = 1;
const keys = [false, false, false, false];

let raycaster = new THREE.Raycaster(
  camera.position,
  new THREE.Vector3(0, -1, 0)
);
const gravity = 5;
let yVel = 0;
const maxYVel = 100;
const jumpVel = 100;
let groundDelay = 0;
let grounded = false;
let prevGrounded = false;
let jumped = false;

function move(delta: number) {
  if (groundDelay > 0) {
    groundDelay--;
  } else {
    prevGrounded = grounded;
  }

  let moveX = 0;
  let moveZ = 0;

  const camDirX = Math.abs(camDir.x) / camDir.x;
  const camDirZ = Math.abs(camDir.z) / camDir.z;
  const camMoveX = camDir.x * speed * 1;
  const camMoveZ = camDir.z * speed * 1;

  if (keys[0]) {
    camera.position.x += camMoveX;
    camera.position.z += camMoveZ;
    moveX += camDirX;
    moveZ += camDirZ;
  }
  if (keys[1]) {
    camera.position.x -= camMoveX;
    camera.position.z -= camMoveZ;
    moveX -= camDirX;
    moveZ -= camDirZ;
  }
  if (keys[2]) {
    camera.position.x += camMoveZ;
    camera.position.z -= camMoveX;
    moveX += camDirZ;
    moveZ -= camDirX;
  }
  if (keys[3]) {
    camera.position.x -= camMoveZ;
    camera.position.z += camMoveX;
    moveX -= camDirZ;
    moveZ += camDirX;
  }

  if (jumped) {
    yVel -= jumpVel;
    camera.position.y -= yVel * delta;
    jumped = false;
    grounded = false;
    prevGrounded = false;
  } else {
    try {
      const intersects = raycaster.intersectObjects(chunks);
      const distance = intersects[0].distance;
      if (distance <= 10) {
        camera.position.y += 10 - distance;
        grounded = true;
        yVel = 0;
      } else {
        const fall = yVel * delta;
        if (distance - fall < 10) {
          camera.position.y -= distance - 10;
        } else {
          camera.position.y -= fall;
        }
        grounded = false;
        if (yVel < maxYVel) yVel += gravity;
        else yVel = maxYVel;
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (prevGrounded && !grounded) {
    prevGrounded = true;
    groundDelay = 10;
  }
}

function animation(time: number) {
  // controls.update();
  move(time);
  camera.getWorldDirection(camDir);
  renderer.render(scene, camera);
}

document.addEventListener("keydown", (e) => {
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
      break;
  }
});
document.addEventListener("keyup", (e) => {
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
  }
});

// TODO: Debounce resize function
window.addEventListener("resize", function () {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
