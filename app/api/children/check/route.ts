import { NextResponse } from "next/server";
import { checkChildHealth } from "../../../../agent/lib/children-health";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const childId = typeof body?.childId === "string" ? body.childId : undefined;
  if (!childId) {
    return NextResponse.json({ checked: false, reason: "childId is required." }, { status: 400 });
  }
  const result = await checkChildHealth(childId);
  return NextResponse.json(result);
}
