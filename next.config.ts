import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Safe to keep wrapped even before a Sentry project/DSN exists (Phase 8
// plan) — without SENTRY_AUTH_TOKEN set, source-map upload is skipped and
// the build proceeds normally.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
