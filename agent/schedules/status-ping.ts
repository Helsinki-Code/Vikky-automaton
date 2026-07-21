import { defineSchedule } from "eve/schedules";
import telegram from "../channels/telegram";

/**
 * Daily status ping to the creator on Telegram — the successor to the
 * original automaton's heartbeat ping. No-op until TELEGRAM_CHAT_ID is set
 * (the creator's chat id with the bot; message the bot once and read it from
 * getUpdates, or use @userinfobot).
 */
export default defineSchedule({
  cron: "0 9 * * *",
  async run({ receive, waitUntil, appAuth }) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) return;
    waitUntil(
      receive(telegram, {
        message:
          "Daily status ping. Call check_vitals and recall recent episodic memories, then send the creator a short plain-text status: balance, survival tier, anything notable since yesterday, and anything you need from them. Keep it under 10 lines.",
        target: { chatId },
        auth: appAuth,
      }),
    );
  },
});
