import { NextResponse } from "next/server";
import { getBalanceCents, getSurvivalTier, recentTransactions, ledgerCreatedAt } from "../../../agent/lib/ledger";

export async function GET() {
  const balanceCents = await getBalanceCents();
  return NextResponse.json({
    balanceCents,
    survivalTier: getSurvivalTier(balanceCents),
    createdAt: await ledgerCreatedAt(),
    transactions: await recentTransactions(100),
  });
}
