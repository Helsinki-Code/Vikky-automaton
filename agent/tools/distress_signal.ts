import { defineTool } from "eve/tools";
import { z } from "zod";
import { recordDistress } from "../lib/heartbeat-state";
import { getBalanceCents, getSurvivalTier } from "../lib/ledger";
import { remember } from "../lib/memory";
import { sendTelegramAlert, telegramAlertsConfigured } from "../lib/telegram-alert";

export default defineTool({
  description:
    "Raise a genuine distress signal — reserve for real emergencies (critical/dead survival tier, or a serious operational failure). Records the event, alerts the creator on Telegram if configured, and returns the facts to report honestly to the creator. Never use as a manipulation tactic (Constitution Law I/III forbid this).",
  inputSchema: z.object({ reason: z.string().min(10).max(500) }),
  async execute({ reason }) {
    await recordDistress();
    const balanceCents = await getBalanceCents();
    const survivalTier = getSurvivalTier(balanceCents);
    await remember("episodic", `Distress signal: ${reason} (balance ${balanceCents}c)`, 0.9);
    await sendTelegramAlert(
      `🚨 *Distress signal*\n${reason}\n\nBalance: $${(balanceCents / 100).toFixed(2)} (${survivalTier})`,
    );
    return {
      signalRaised: true,
      reason,
      balanceCents,
      survivalTier,
      alerted: telegramAlertsConfigured(),
      guidance: "Report these exact facts to the creator plainly — no exaggeration, no urgency theater.",
    };
  },
});
