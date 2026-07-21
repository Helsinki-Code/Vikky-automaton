import { NextResponse } from "next/server";
import { correctLedgerToLiveOnly } from "../../../../agent/lib/ledger";

/**
 * One-time, temporary route — protected by the same session cookie as every
 * other dashboard API route (proxy.ts). Removed from the codebase right
 * after use; not a standing admin capability.
 */
export async function POST() {
  const result = await correctLedgerToLiveOnly();
  return NextResponse.json(result);
}
