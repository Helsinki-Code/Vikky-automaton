import { NextResponse } from "next/server";
import { listChildren } from "../../../agent/lib/registry";

export async function GET() {
  const children = await listChildren();
  return NextResponse.json({
    children,
    total: children.length,
    alive: children.filter((c) => c.status !== "dead").length,
  });
}
