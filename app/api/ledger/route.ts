import { NextResponse } from "next/server";
import { getBalanceCents, getSurvivalTier, recentTransactions, ledgerCreatedAt } from "../../../agent/lib/ledger";

export async function GET() {
  const balanceCents = getBalanceCents();
  return NextResponse.json({
    balanceCents,
    survivalTier: getSurvivalTier(balanceCents),
    createdAt: ledgerCreatedAt(),
    transactions: recentTransactions(100),
  });
}
