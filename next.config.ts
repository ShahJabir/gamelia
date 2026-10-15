import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  devIndicators: false,
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project slugs (configured via environment variables)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Auth token for uploading source maps in CI/build
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Route Sentry requests through your server (avoids ad-blockers)
  tunnelRoute: "/monitoring",

  // Upload a larger set of client files for better stack traces
  widenClientFileUpload: true,

  // Automatically delete source maps from generated client bundles after upload
  // (essential for Docker containers so sourcemaps are not leaked into production images)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
