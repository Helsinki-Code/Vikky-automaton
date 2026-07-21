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

export async function registerService(
  service: Omit<DeployedService, "id" | "status" | "createdAt"> & { id?: string },
): Promise<DeployedService> {
  const services = await listServices();
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

export async function activeServiceCount(): Promise<number> {
  return (await listServices()).filter((s) => s.status !== "removed").length;
}
