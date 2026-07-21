import type { NextConfig } from "next";
import { withEve } from "eve/next";

/**
 * Mounts the existing agent/ directory (this same project) alongside the
 * Next.js dashboard app, so useEveAgent() can talk to it same-origin — no
 * CORS, no separate URL to configure. eveRoot defaults to the Next.js app
 * root, which is exactly where agent/ already lives.
 */
const nextConfig: NextConfig = {};

export default withEve(nextConfig);
