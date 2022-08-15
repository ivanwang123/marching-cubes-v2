import { storageKeys } from "./constants";

export function getChunkKey(chunkX: number, chunkZ: number) {
  return `${chunkX},${chunkZ}`;
}

export function getSeed(): number {
  return parseFloat(
    sessionStorage.getItem(storageKeys.MAP_SEED) || Math.random().toString()
  );
}
