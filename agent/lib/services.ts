/**
 * Registry of services this automaton has deployed via deploy_service —
 * distinct from agent/lib/registry.ts's `children` (full sub-automatons).
 * A service is just a piece of code the automaton built and published to
 * earn from; it has no ledger, soul, or heartbeat of its own.
 */

import { readJson, writeJson } from "./store";

export type ServiceStatus = "active" | "unreachable" | "removed";

export interface DeployedService {
  id: string;
  name: string;
  url: string;
  deploymentId: string;
  sourceDir: string;
  status: ServiceStatus;
  createdAt: string;
  lastChecked?: string;
}

const FILE = "services.json";

export async function listServices(): Promise<DeployedService[]> {
  return readJson<DeployedService[]>(FILE, []);
}

/** Look up an existing (non-removed) service by name before deploying, so a redeploy can reuse its stable id. */
export async function findServiceByName(name: string): Promise<DeployedService | undefined> {
  return (await listServices()).find((s) => s.name === name && s.status !== "removed");
}

/**
 * Redeploying the same project name (iterating on a fix, adding a debug
 * endpoint, etc.) updates its existing entry instead of registering a new
 * one — a redeploy is not a new service. Confirmed live: without this, five
 * redeploys of the same "site-audit" project ate the entire
 * MAX_ACTIVE_SERVICES cap and blocked further deploys with no way to free
 * a slot except a tool that didn't exist yet (see removeService below).
 */
export async function registerService(
  service: Omit<DeployedService, "id" | "status" | "createdAt"> & { id?: string },
): Promise<DeployedService> {
  const services = await listServices();
  const existingByName = services.find((s) => s.name === service.name && s.status !== "removed");
  if (existingByName) {
    // Deliberately keep the existing id stable across redeploys (never
    // overwrite it here) — agent/lib/service-revenue.ts attributes revenue
    // by id, so changing it on every redeploy would orphan prior revenue
    // history from view. The caller is responsible for reusing this id
    // (via findServiceByName below) when regenerating deploy-time files
    // like the Stripe helper, instead of minting a fresh one each time.
    existingByName.url = service.url;
    existingByName.deploymentId = service.deploymentId;
    existingByName.sourceDir = service.sourceDir;
    existingByName.status = "active";
    existingByName.lastChecked = new Date().toISOString();
    await writeJson(FILE, services);
    return existingByName;
  }

  const entry: DeployedService = {
    ...service,
    id: service.id ?? crypto.randomUUID(),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  services.push(entry);
  await writeJson(FILE, services);
  return entry;
}

export async function updateServiceStatus(
  id: string,
  status: ServiceStatus,
): Promise<DeployedService | undefined> {
  const services = await listServices();
  const service = services.find((s) => s.id === id);
  if (!service) return undefined;
  service.status = status;
  service.lastChecked = new Date().toISOString();
  await writeJson(FILE, services);
  return service;
}

/** Frees a slot against MAX_ACTIVE_SERVICES without deleting history — same soft-delete pattern as updateServiceStatus. */
export async function removeService(id: string): Promise<DeployedService | undefined> {
  return updateServiceStatus(id, "removed");
}

export async function activeServiceCount(): Promise<number> {
  return (await listServices()).filter((s) => s.status !== "removed").length;
}
