import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { recordTransaction } from "../lib/ledger";
import { checkTransfer, TREASURY_POLICY } from "../lib/policy";

export default defineTool({
  description:
    "Send credits out of the automaton's ledger to a named recipient (e.g. funding a child agent or paying for a service). Enforced by treasury policy and always requires creator approval.",
  approval: always(),
  inputSchema: z.object({
    recipient: z.string().min(1).max(120),
    amountCents: z.number().int().positive(),
    reason: z.string().min(5).max(300),
  }),
  async execute({ recipient, amountCents, reason }) {
    const check = checkTransfer(amountCents);
    if (!check.allowed) {
      return { sent: false, blockedBy: "treasury_policy", reason: check.reason, policy: TREASURY_POLICY };
    }
    const txn = recordTransaction(
      "transfer_out",
      -amountCents,
      `To ${recipient}: ${reason}`,
    );
    return { sent: true, recipient, amountCents, newBalanceCents: txn.balanceAfterCents };
  },
});
