export type NoiseMap = Float32Array[][];

export type LoadedChunks = {
  [key: string]: {
    mesh: THREE.Object3D | null;
    noiseMap: NoiseMap | null;
  };
};

export type NoiseMapCache = {
  [key: string]: {
    noiseMap: number[][][][];
    noiseLayers: number[];
  };
};

interface FromNoiseMap {
  noiseMap: NoiseMap | null;
  noiseLayers?: never;
  seed?: never;
}
interface FromLayersAndSeed {
  noiseLayers: NoiseLayers | null;
  seed: Seed | null;
  noiseMap?: never;
}
export type Generate = FromNoiseMap | FromLayersAndSeed;

export type NoiseLayers = [number, number, number];
export type Seed = number;
export type LayersAndSeed = [NoiseLayers, Seed];
