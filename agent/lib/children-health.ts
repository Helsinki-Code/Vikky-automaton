/**
 * Shared health-check logic for children — used by both check_child_status
 * (chat-driven) and the dashboard's Children page (button-driven), same
 * one-implementation pattern as agent/lib/deposits.ts.
 */

import { listChildren, updateChildStatus, type Child } from "./registry";

export type CheckChildResult =
  | { checked: true; healthy: boolean; status?: string; reason?: string }
  | { checked: false; reason: string };

export async function checkChildHealth(childId: string): Promise<CheckChildResult> {
  const child = (await listChildren()).find((c: Child) => c.id === childId);
  if (!child) return { checked: false, reason: `No child with id ${childId}.` };
  if (!child.deploymentUrl) {
    return { checked: true, healthy: false, status: child.status, reason: "No deployment URL recorded yet." };
  }
  try {
    const resp = await fetch(`${child.deploymentUrl}/eve/v1/session`, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(8_000),
    });
    const healthy = resp.status < 500;
    const updated = await updateChildStatus(childId, healthy ? "running" : "unknown");
    return { checked: true, healthy, status: updated?.status };
  } catch {
    const updated = await updateChildStatus(childId, "dead");
    return { checked: true, healthy: false, status: updated?.status };
  }
}
