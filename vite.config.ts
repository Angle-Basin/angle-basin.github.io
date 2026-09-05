import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // Relative URLs so `/assets/*` resolves correctly regardless of apex domain vs gh.io hosting quirks.
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        press: resolve(import.meta.dirname, "press/eigengrau/index.html"),
      },
    },
  },
});
