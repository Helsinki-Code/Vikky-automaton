import { NextResponse } from "next/server";
import { listReputation } from "../../../agent/lib/registry";

export async function GET() {
  const entries = await listReputation();
  const byAgent: Record<string, { count: number; averageScore: number }> = {};
  for (const e of entries) {
    if (!byAgent[e.toAgent]) byAgent[e.toAgent] = { count: 0, averageScore: 0 };
    byAgent[e.toAgent].averageScore =
      (byAgent[e.toAgent].averageScore * byAgent[e.toAgent].count + e.score) / (byAgent[e.toAgent].count + 1);
    byAgent[e.toAgent].count += 1;
  }
  return NextResponse.json({ entries: entries.slice(-50).reverse(), byAgent });
}
