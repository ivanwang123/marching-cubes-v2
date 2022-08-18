export type NoiseMap = Float32Array[][];

export type LoadedChunks = {
  [key: string]: {
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshNormalMaterial> | null;
    noiseMap: NoiseMap | null;
  };
};

export type NoiseMapCache = {
  [key: string]: {
    noiseMap: number[][][][];
    noiseLayers: number[];
    seed: number;
  };
};

interface FromNoiseMap {
  noiseMap: NoiseMap | null;
  noiseLayers?: never;
  seed?: never;
}
interface FromLayersAndSeed {
  noiseLayers?: NoiseLayers | null;
  seed?: Seed | null;
  noiseMap?: never;
}
export type Generate = FromNoiseMap | FromLayersAndSeed;

export type NoiseLayers = [number, number, number];
export type Seed = number;
export type LayersAndSeed = [NoiseLayers, Seed];

export type WorkerMessage = [
  x: number,
  z: number,
  noiseLayers: NoiseLayers | null,
  seed: number,
  interpolate: boolean,
  wireframe: boolean
];

export type WorkerReturnMessage = [x: number, z: number, meshJson: any];
