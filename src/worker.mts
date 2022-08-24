import { generateMesh } from "./meshGenerator";
import { WorkerMessage } from "./types";

addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
  let mesh = null;
  if (e.data[2]) {
    mesh = generateMesh(
      e.data[0],
      0,
      e.data[1],
      {
        noiseLayers: e.data[2],
        seed: e.data[3],
      },
      e.data[4],
      e.data[5]
    );
  } else {
    mesh = generateMesh(
      e.data[0],
      0,
      e.data[1],
      { seed: e.data[3] },
      e.data[4],
      e.data[5]
    );
  }
  postMessage([e.data[0], e.data[1], mesh.toJSON()]);
});
