import { CHUNK_SIZE, CHUNK_HEIGHT } from "./constants";
import { generateNoiseMap } from "./noiseMapGenerator";
import { getChunkKey } from "./utils";
import { NoiseMap } from "./types";

export function editNoiseMap(
  noiseMap: NoiseMap,
  worldPoint: THREE.Vector3,
  chunkX: number,
  chunkY: number,
  chunkZ: number,
  remove: boolean = false
) {
  worldPoint.x += CHUNK_SIZE * (chunkX + 0.5);
  worldPoint.y += CHUNK_HEIGHT * chunkY;
  worldPoint.z += CHUNK_SIZE * (chunkZ + 0.5);

  const mapX =
    ((Math.floor(worldPoint.x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const mapY =
    ((Math.floor(worldPoint.y) % CHUNK_HEIGHT) + CHUNK_HEIGHT) % CHUNK_HEIGHT;
  const mapZ =
    ((Math.floor(worldPoint.z) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  const radius = 2;

  const addOrRemove = remove ? 1 : -1;

  for (let y = mapY - radius; y <= mapY + radius; y++) {
    if (y <= 0 || y >= CHUNK_HEIGHT) continue;
    for (let z = mapZ - radius; z <= mapZ + radius; z++) {
      if (z <= 0 || z >= CHUNK_SIZE) continue;
      for (let x = mapX - radius; x <= mapX + radius; x++) {
        if (x <= 0 || x >= CHUNK_SIZE) continue;
        noiseMap[y][z][x] +=
          (addOrRemove *
            (radius * radius * 3 -
              ((mapY - y) * (mapY - y) +
                (mapZ - z) * (mapZ - z) +
                (mapX - x) * (mapX - x)))) /
          60;
      }
    }
  }

  return noiseMap;
}

export function editNoiseMapChunks(
  loadedChunks: any,
  worldPoint: THREE.Vector3,
  remove: boolean,
  noiseLayers?: number[] | null
) {
  const chunkX = Math.floor((worldPoint.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
  const chunkZ = Math.floor((worldPoint.z + CHUNK_SIZE / 2) / CHUNK_SIZE);

  worldPoint.x += CHUNK_SIZE * (chunkX + 0.5);
  worldPoint.y += 0;
  worldPoint.z += CHUNK_SIZE * (chunkZ + 0.5);

  const mapX =
    ((Math.floor(worldPoint.x) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const mapY =
    ((Math.floor(worldPoint.y) % CHUNK_HEIGHT) + CHUNK_HEIGHT) % CHUNK_HEIGHT;
  const mapZ =
    ((Math.floor(worldPoint.z) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  let noiseMap =
    getChunkKey(chunkX, chunkZ) in loadedChunks
      ? loadedChunks[getChunkKey(chunkX, chunkZ)].noiseMap
      : null;
  if (!noiseMap) {
    noiseMap = generateNoiseMap(chunkX, 0, chunkZ, noiseLayers);
  }

  let noiseMapX: NoiseMap | null = null;
  let noiseMapZ: NoiseMap | null = null;
  let noiseMapXZ: NoiseMap | null = null;

  let chunkXOffset = 0;
  let chunkZOffset = 0;

  const radius = 2;

  const addOrRemove = remove ? 1 : -1;

  for (let y = mapY - radius; y <= mapY + radius; y++) {
    if (y <= 0 || y >= CHUNK_HEIGHT) continue;
    for (let z = mapZ - radius; z <= mapZ + radius; z++) {
      for (let x = mapX - radius; x <= mapX + radius; x++) {
        try {
          let editNoise =
            (addOrRemove *
              (radius * radius * 3 -
                ((mapY - y) * (mapY - y) +
                  (mapZ - z) * (mapZ - z) +
                  (mapX - x) * (mapX - x)))) /
            120;

          // Check if x and z are in or out of bounds
          // -1 = out of bounds, 1 = in bounds, 0 = in both bounds
          let xInBound = 1;
          let zInBound = 1;

          if (x <= 0) {
            chunkXOffset = -1;
            xInBound = -1;
            if (x === 0) xInBound = 0;
          } else if (x >= CHUNK_SIZE) {
            chunkXOffset = 1;
            xInBound = -1;
            if (x === CHUNK_SIZE) xInBound = 0;
          }
          if (z <= 0) {
            chunkZOffset = -1;
            zInBound = -1;
            if (z === 0) zInBound = 0;
          } else if (z >= CHUNK_SIZE) {
            chunkZOffset = 1;
            zInBound = -1;
            if (z === CHUNK_SIZE) zInBound = 0;
          }

          if (xInBound <= 0 && zInBound >= 0) {
            const chunkKeyX = getChunkKey(chunkX + chunkXOffset, chunkZ);
            if (!noiseMapX)
              noiseMapX =
                chunkKeyX in loadedChunks
                  ? loadedChunks[chunkKeyX].noiseMap
                  : null;
            if (!noiseMapX) {
              noiseMapX = generateNoiseMap(
                chunkX + chunkXOffset,
                0,
                chunkZ,
                noiseLayers
              );
            }

            noiseMapX[y][z][x - chunkXOffset * CHUNK_SIZE] += editNoise;
          }

          if (zInBound <= 0 && xInBound >= 0) {
            const chunkKeyZ = getChunkKey(chunkX, chunkZ + chunkZOffset);
            if (!noiseMapZ)
              noiseMapZ =
                chunkKeyZ in loadedChunks
                  ? loadedChunks[chunkKeyZ].noiseMap
                  : null;
            if (!noiseMapZ) {
              noiseMapZ = generateNoiseMap(
                chunkX,
                0,
                chunkZ + chunkZOffset,
                noiseLayers
              );
            }

            noiseMapZ[y][z - chunkZOffset * CHUNK_SIZE][x] += editNoise;
          }

          if (xInBound <= 0 && zInBound <= 0) {
            const chunkKeyXZ = getChunkKey(
              chunkX + chunkXOffset,
              chunkZ + chunkZOffset
            );
            if (!noiseMapXZ)
              noiseMapXZ =
                chunkKeyXZ in loadedChunks
                  ? loadedChunks[chunkKeyXZ].noiseMap
                  : null;
            if (!noiseMapXZ) {
              noiseMapXZ = generateNoiseMap(
                chunkX + chunkXOffset,
                0,
                chunkZ + chunkZOffset,
                noiseLayers
              );
            }

            noiseMapXZ[y][z - chunkZOffset * CHUNK_SIZE][
              x - chunkXOffset * CHUNK_SIZE
            ] += editNoise;
          }

          if (xInBound >= 0 && zInBound >= 0) {
            noiseMap[y][z][x] += editNoise;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  let editChunks = [];
  try {
    if (noiseMapX) {
      loadedChunks[getChunkKey(chunkX + chunkXOffset, chunkZ)].noiseMap =
        noiseMapX;
      editChunks.push([chunkX + chunkXOffset, chunkZ]);
    }
    if (noiseMapZ) {
      loadedChunks[getChunkKey(chunkX, chunkZ + chunkZOffset)].noiseMap =
        noiseMapZ;
      editChunks.push([chunkX, chunkZ + chunkZOffset]);
    }
    if (noiseMapXZ) {
      loadedChunks[
        getChunkKey(chunkX + chunkXOffset, chunkZ + chunkZOffset)
      ].noiseMap = noiseMapXZ;
      editChunks.push([chunkX + chunkXOffset, chunkZ + chunkZOffset]);
    }

    loadedChunks[getChunkKey(chunkX, chunkZ)].noiseMap = noiseMap;
    editChunks.push([chunkX, chunkZ]);
  } catch (e) {
    console.error(e);
  }
  return editChunks;
}
