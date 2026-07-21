import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev, placeholderAuth, vercelOidc, type AuthFn } from "eve/channels/auth";

/**
 * Real route auth for the creator's own HTTP/dashboard traffic: a shared
 * username/password checked with constant-time comparison. Falls back to
 * placeholderAuth() (a structured 401, safe by default) only when the
 * creator hasn't set credentials yet — this keeps `eve dev` usable out of
 * the box while never silently accepting unauthenticated production traffic.
 */
function creatorAuth(): AuthFn<Request> {
  const username = process.env.ROUTE_AUTH_USERNAME;
  const password = process.env.ROUTE_AUTH_PASSWORD;
  if (!username || !password) {
    return placeholderAuth();
  }
  return httpBasic({ username, password });
}

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // The creator's own credential — set ROUTE_AUTH_USERNAME/ROUTE_AUTH_PASSWORD
    // in .env.local (or the Vercel project env) to activate it for real.
    creatorAuth(),
  ],
});
