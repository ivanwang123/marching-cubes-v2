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
