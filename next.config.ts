import type { NextConfig } from "next";
import { withEve } from "eve/next";

/**
 * Mounts the existing agent/ directory (this same project) alongside the
 * Next.js dashboard app, so useEveAgent() can talk to it same-origin — no
 * CORS, no separate URL to configure. eveRoot defaults to the Next.js app
 * root, which is exactly where agent/ already lives.
 */
const nextConfig: NextConfig = {
  typescript: {
    // We run `tsc` ourselves as a separate, authoritative typecheck step
    // (see package.json's "typecheck" script and the verification workflow).
    // Next's own build-time TypeScript "verify setup" step has a bug on this
    // stack (16.2.10 + Turbopack) where it tries to auto-repair package.json
    // dependency placement and then crashes internally
    // ("id" argument must be of type string) instead of just building.
    // Skipping it here avoids that crash; it does not skip our real
    // typecheck, which still runs via `npx tsc` before every deploy.
    ignoreBuildErrors: true,
  },
};

export default withEve(nextConfig);
