import { defineConfig } from "@trigger.dev/sdk";
import { additionalFiles } from "@trigger.dev/build/extensions/core";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";

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
      {
        name: "sentry-external-dev",
        externalsForTarget: (target) => (target === "dev" ? ["@sentry/node"] : []),
      },
      esbuildPlugin(
        sentryEsbuildPlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
        }),
        { placement: "last", target: "deploy" }
      ),
    ],
  },
});
