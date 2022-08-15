import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { generateNoiseMap } from "./noiseMapGenerator";
import { edges, edgeCorners, table } from "./triangulation";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "./constants";
import { NoiseMap } from "./types";

const SURFACE_LEVEL = 0;

export function generateChunk(
  chunkX: number,
  chunkY: number,
  chunkZ: number,
  noiseMap?: NoiseMap | null,
  noiseLayers?: number[]
) {
  let geoms = [];

  if (!noiseMap) {
    if (noiseLayers) {
      noiseMap = generateNoiseMap(chunkX, chunkY, chunkZ, noiseLayers);
    } else {
      noiseMap = generateNoiseMap(chunkX, chunkY, chunkZ);
    }
  }

  let deltaTime = 0;
  let deltaBefore = 0;
  let deltaAfter = 0;

  let beforeTime = new Date().getTime();
  // Create cube based on noise map
  let cubeCounter = 0;
  let y = 0;
  while (y < CHUNK_HEIGHT) {
    let z = 0;
    while (z < CHUNK_SIZE) {
      let x = 0;
      while (x < CHUNK_SIZE) {
        let cubeIndex = 0;
        const noiseMapYBot = noiseMap[y];
        const noiseMapYTop = noiseMap[y + 1];

        // Get noise value of each corner of the cube
        let cornerNoises = [
          noiseMapYBot[z][x],
          noiseMapYBot[z][x + 1],
          noiseMapYBot[z + 1][x + 1],
          noiseMapYBot[z + 1][x],
          noiseMapYTop[z][x],
          noiseMapYTop[z][x + 1],
          noiseMapYTop[z + 1][x + 1],
          noiseMapYTop[z + 1][x],
        ];

        // Calculate cube index based on corner noises
        for (let n = 0; n < cornerNoises.length; n++) {
          if (cornerNoises[n] < SURFACE_LEVEL) {
            cubeIndex += 1 << n;
          }
        }

        if (cubeIndex !== 0 && cubeIndex !== 255) {
          // Get edges from table based on cube index
          const tableEdges = table[cubeIndex];

          let e = 0;
          while (e < tableEdges.length) {
            // Vectors of edges
            const edge1 = edges[tableEdges[e]];
            const edge2 = edges[tableEdges[e + 1]];
            const edge3 = edges[tableEdges[e + 2]];

            // Id of corners that make up the edges
            const edgeCorners1 = edgeCorners[tableEdges[e]];
            const edgeCorners2 = edgeCorners[tableEdges[e + 1]];
            const edgeCorners3 = edgeCorners[tableEdges[e + 2]];

            // Interpolate edges for smoother surface
            let edgeInterpolate1 =
              Math.abs(cornerNoises[edgeCorners1[0]] - SURFACE_LEVEL) /
              Math.abs(
                cornerNoises[edgeCorners1[1]] - cornerNoises[edgeCorners1[0]]
              );
            // edgeInterpolate1 = parseFloat(edgeInterpolate1.toFixed(3));
            let edgeInterpolate2 =
              Math.abs(cornerNoises[edgeCorners2[0]] - SURFACE_LEVEL) /
              Math.abs(
                cornerNoises[edgeCorners2[1]] - cornerNoises[edgeCorners2[0]]
              );
            // edgeInterpolate2 = parseFloat(edgeInterpolate2.toFixed(3));
            let edgeInterpolate3 =
              Math.abs(cornerNoises[edgeCorners3[0]] - SURFACE_LEVEL) /
              Math.abs(
                cornerNoises[edgeCorners3[1]] - cornerNoises[edgeCorners3[0]]
              );
            // edgeInterpolate3 = parseFloat(edgeInterpolate3.toFixed(3));

            // Create surface with edges
            deltaBefore = new Date().getTime();
            let geom = new THREE.BufferGeometry();
            let vertices = new Float32Array([
              // (edge1[0] === 0.5 ? edgeInterpolate1 : edge1[0]) + xOffset,
              // (edge1[1] === 0.5 ? edgeInterpolate1 : edge1[1]) + yOffset,
              // (edge1[2] === 0.5 ? edgeInterpolate1 : edge1[2]) + zOffset,
              // (edge2[0] === 0.5 ? edgeInterpolate2 : edge2[0]) + xOffset,
              // (edge2[1] === 0.5 ? edgeInterpolate2 : edge2[1]) + yOffset,
              // (edge2[2] === 0.5 ? edgeInterpolate2 : edge2[2]) + zOffset,
              // (edge3[0] === 0.5 ? edgeInterpolate3 : edge3[0]) + xOffset,
              // (edge3[1] === 0.5 ? edgeInterpolate3 : edge3[1]) + yOffset,
              // (edge3[2] === 0.5 ? edgeInterpolate3 : edge3[2]) + zOffset,
              edge1[0] === 0.5 ? edgeInterpolate1 : edge1[0],
              edge1[1] === 0.5 ? edgeInterpolate1 : edge1[1],
              edge1[2] === 0.5 ? edgeInterpolate1 : edge1[2],
              edge2[0] === 0.5 ? edgeInterpolate2 : edge2[0],
              edge2[1] === 0.5 ? edgeInterpolate2 : edge2[1],
              edge2[2] === 0.5 ? edgeInterpolate2 : edge2[2],
              edge3[0] === 0.5 ? edgeInterpolate3 : edge3[0],
              edge3[1] === 0.5 ? edgeInterpolate3 : edge3[1],
              edge3[2] === 0.5 ? edgeInterpolate3 : edge3[2],
              // edge1[0],
              // edge1[1],
              // edge1[2],
              // edge2[0],
              // edge2[1],
              // edge2[2],
              // edge3[0],
              // edge3[1],
              // edge3[2],
            ]);

            const xOffset =
              (cubeCounter % CHUNK_SIZE) + (chunkX - 0.5) * CHUNK_SIZE;
            const yOffset =
              Math.floor(cubeCounter / (CHUNK_SIZE * CHUNK_SIZE)) -
              chunkY * CHUNK_HEIGHT;
            const zOffset =
              Math.floor(
                (cubeCounter % (CHUNK_SIZE * CHUNK_SIZE)) / CHUNK_SIZE
              ) +
              (chunkZ - 0.5) * CHUNK_SIZE;

            geom.setAttribute(
              "position",
              new THREE.BufferAttribute(vertices, 3)
            );
            geom.translate(xOffset, yOffset, zOffset);
            geoms.push(geom);

            deltaAfter = new Date().getTime();
            deltaTime += deltaAfter - deltaBefore;

            e += 3;
          }
        }
        cubeCounter++;
        x++;
      }
      z++;
    }
    y++;
  }

  // Merge chunk
  let chunk = mergeBufferGeometries(geoms);
  chunk.computeVertexNormals();
  let mesh = new THREE.Mesh(
    chunk,
    new THREE.MeshNormalMaterial({
      side: THREE.DoubleSide,
    })
  );
  let afterTime = new Date().getTime();
  // console.log("GENERATE MESH", afterTime - beforeTime);
  // console.log("GENERATE MESH DELTA", deltaTime);

  return mesh;
}
