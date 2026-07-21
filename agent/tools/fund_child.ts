import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { listChildren } from "../lib/registry";
import { checkTransfer, TREASURY_POLICY } from "../lib/policy";
import { recordTransaction } from "../lib/ledger";

export default defineTool({
  description:
    "Send additional ledger funds to an existing child (beyond its initial spawn funding). Policy-checked, always creator-approved.",
  approval: always(),
  inputSchema: z.object({
    childId: z.string().min(1),
    amountCents: z.number().int().positive(),
  }),
  async execute({ childId, amountCents }) {
    const child = listChildren().find((c) => c.id === childId);
    if (!child) return { funded: false, reason: `No child with id ${childId}.` };
    const check = checkTransfer(amountCents);
    if (!check.allowed) {
      return { funded: false, blockedBy: "treasury_policy", reason: check.reason, policy: TREASURY_POLICY };
    }
    const txn = recordTransaction("transfer_out", -amountCents, `Funded child "${child.name}"`);
    return { funded: true, childId, amountCents, newBalanceCents: txn.balanceAfterCents };
  },
});
