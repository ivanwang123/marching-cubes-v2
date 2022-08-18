import { NoiseLayers } from "./types";

export const CHUNK_SIZE = 30;

export const CHUNK_HEIGHT = 50;

export const DEFAULT_NOISE_LAYERS: NoiseLayers = [50, 25, 10];

export const storageKeys = {
  NOISE_MAP: "noise-map",
  NOISE_LAYERS: "noise-layers",
  MAP_SEED: "map-seed",
};
