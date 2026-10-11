import { defineConfig } from "@trigger.dev/sdk";
import { additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_pvszrqiipgvlgtbevbyz",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  build: {
    external: ["form-data", "busboy"],
    extensions: [
      additionalFiles({
        files: ["src/lib/games/runtime/**", "lib/games/runtime/**"],
      }),
    ],
  },
});
