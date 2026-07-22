/**
 * Lets the automaton deploy its own separate Vercel project to host a real,
 * publicly-reachable service (e.g. a paid API it built and wants to charge
 * for). Vercel Sandbox itself has no runtime "expose this port publicly" API
 * (see agent/tools/expose_port.ts) — a real public URL means a real Vercel
 * deployment, the same way spawn_child deploys child agents. Uses the plain
 * REST API (not the `vercel` CLI) so the token only ever touches this app
 * runtime, never the agent-controlled sandbox shell.
 */

import type { SandboxSession } from "eve/sandbox";

const VERCEL_API = "https://api.vercel.com";
const MAX_FILES = 200;
const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 2_000_000;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".vercel", ".eve"]);

export interface DeployFile {
  file: string;
  data: string;
}

export interface VercelDeployConfig {
  token: string;
  teamId?: string;
}

export function loadVercelDeployConfig(): VercelDeployConfig | null {
  const token = process.env.AUTOMATON_VERCEL_TOKEN;
  if (!token) return null;
  return { token, teamId: process.env.AUTOMATON_VERCEL_TEAM_ID || undefined };
}

/** Reads every text file under `dir` in the sandbox, relative to `dir`, with size/count caps. */
export async function collectSandboxFiles(
  sandbox: SandboxSession,
  dir: string,
): Promise<{ files: DeployFile[]; truncated: boolean }> {
  const list = await sandbox.run({ command: `find ${dir} -type f | head -n ${MAX_FILES + 1}` });
  const paths = list.stdout
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.split("/").some((segment) => SKIP_DIRS.has(segment)));

  const truncated = paths.length > MAX_FILES;
  const files: DeployFile[] = [];
  let totalBytes = 0;

  for (const path of paths.slice(0, MAX_FILES)) {
    const rel = path.startsWith(dir) ? path.slice(dir.length).replace(/^\/+/, "") : path;
    try {
      const content = await sandbox.readTextFile({ path });
      if (content === null) continue;
      const bytes = Buffer.byteLength(content, "utf-8");
      if (bytes > MAX_FILE_BYTES) continue;
      if (totalBytes + bytes > MAX_TOTAL_BYTES) break;
      totalBytes += bytes;
      files.push({ file: rel, data: content });
    } catch {
      // Skip unreadable (e.g. binary) files — this deploy path is for text-based services.
    }
  }

  return { files, truncated: truncated || totalBytes >= MAX_TOTAL_BYTES };
}

export interface VercelDeployment {
  id: string;
  url: string;
  readyState: string;
}

export async function createVercelDeployment(
  config: VercelDeployConfig,
  name: string,
  files: DeployFile[],
): Promise<VercelDeployment> {
  const query = config.teamId ? `?teamId=${encodeURIComponent(config.teamId)}` : "";
  const resp = await fetch(`${VERCEL_API}/v13/deployments${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      files,
      target: "production",
      projectSettings: { framework: null },
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Vercel deployment failed: ${data?.error?.message || resp.statusText}`);
  }

  // New projects on a team can inherit "Standard Protection" (Vercel
  // Authentication) by default, which puts every deployment — including
  // production — behind an SSO wall only team members can pass. A paid
  // service nobody but the creator can reach is useless; disable it
  // explicitly rather than relying on the team's default being off.
  await disableDeploymentProtection(config, name).catch(() => {
    // Best-effort: a failure here shouldn't fail the whole deploy, but the
    // caller should still see the deployment as READY so the creator can
    // fix protection manually if this silently didn't take.
  });

  return { id: data.id, url: `https://${data.url}`, readyState: data.readyState };
}

async function disableDeploymentProtection(config: VercelDeployConfig, projectName: string): Promise<void> {
  const query = config.teamId ? `?teamId=${encodeURIComponent(config.teamId)}` : "";
  await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}${query}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ssoProtection: null }),
  });
}

export async function pollDeploymentReady(
  config: VercelDeployConfig,
  deploymentId: string,
  timeoutMs = 60_000,
): Promise<VercelDeployment> {
  const query = config.teamId ? `?teamId=${encodeURIComponent(config.teamId)}` : "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const resp = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}${query}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    const data = await resp.json();
    if (data.readyState === "READY" || data.readyState === "ERROR") {
      return { id: data.id, url: `https://${data.url}`, readyState: data.readyState };
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return { id: deploymentId, url: "", readyState: "TIMEOUT" };
}
