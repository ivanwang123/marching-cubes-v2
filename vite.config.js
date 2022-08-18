import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        noiseEditor: resolve(__dirname, "noise-editor.html"),
        firstPerson: resolve(__dirname, "first-person.html"),
      },
    },
  },
});
