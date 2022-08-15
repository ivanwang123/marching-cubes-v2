import { generateChunk } from "./chunkGenerator";

addEventListener("message", (e) => {
  let mesh = null;
  if (e.data[2]) {
    mesh = generateChunk(e.data[0], 0, e.data[1], undefined, e.data[2]);
  } else {
    mesh = generateChunk(e.data[0], 0, e.data[1]);
  }
  postMessage([e.data[0], e.data[1], mesh.toJSON()]);
});

export {};
