import { NextResponse } from "next/server";
import { listServices } from "../../../agent/lib/services";
import { revenueByService } from "../../../agent/lib/service-revenue";

export async function GET() {
  const services = await listServices();
  const revenue = await revenueByService();
  return NextResponse.json({
    services: services.map((s) => ({
      ...s,
      revenueCents: revenue[s.id]?.totalCents ?? 0,
      paymentCount: revenue[s.id]?.count ?? 0,
    })),
    active: services.filter((s) => s.status === "active").length,
  });
}
