import { NextResponse } from "next/server";
import { getSoul, soulHistoryLength } from "../../../agent/lib/soul";

export async function GET() {
  return NextResponse.json({
    soul: getSoul(),
    previousVersions: soulHistoryLength(),
  });
}
