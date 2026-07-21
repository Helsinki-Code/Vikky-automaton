import { defineHook } from "eve/hooks";
import { recordToolFailure, recordToolSuccess } from "../lib/failure-tracker";
import { sendTelegramAlert } from "../lib/telegram-alert";

/**
 * Pages the creator on Telegram when tool calls are failing repeatedly in a
 * row (e.g. a misconfigured key breaking every Stripe/Vercel call) — the
 * kind of thing that's otherwise only visible via `vercel logs`.
 */
export default defineHook({
  events: {
    async "action.result"(event) {
      const result = event.data.result;
      if (!result || result.kind !== "tool-result") return;

      if (result.isError) {
        const shouldAlert = await recordToolFailure();
        if (shouldAlert) {
          await sendTelegramAlert(
            `⚠️ *Repeated tool failures*\n\`${result.toolName}\` and others have failed several times in a row. Check \`vercel logs\` for details.`,
          );
        }
      } else {
        await recordToolSuccess();
      }
    },
  },
});
