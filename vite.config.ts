import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs so `/assets/*` resolves correctly regardless of apex domain vs gh.io hosting quirks.
  base: "./",
  build: {
    outDir: "dist",
  },
});
