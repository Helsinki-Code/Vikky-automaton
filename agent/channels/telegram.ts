import { telegramChannel } from "eve/channels/telegram";

/**
 * Telegram channel — talk to the automaton from a Telegram bot.
 *
 * Env required in .env.local (or Vercel project env):
 *   TELEGRAM_BOT_TOKEN=123456:...        # from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET_TOKEN=...    # any random string you choose
 *   TELEGRAM_BOT_USERNAME=my_bot         # bot's @username, without the @
 *
 * The channel mounts POST /eve/v1/telegram. After deploying, register the
 * webhook once (eve does not call setWebhook for you):
 *
 *   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url":"https://<your-app>/eve/v1/telegram",
 *          "secret_token":"'"$TELEGRAM_WEBHOOK_SECRET_TOKEN"'",
 *          "allowed_updates":["message","callback_query"]}'
 *
 * HITL approvals (deposits, withdrawals, domain purchases, soul updates)
 * appear in Telegram as inline-keyboard buttons — so the creator can approve
 * or deny from their phone.
 */
export default telegramChannel({
  botUsername: process.env.TELEGRAM_BOT_USERNAME || "vikky_automaton_bot",
  uploadPolicy: {
    allowedMediaTypes: ["image/*", "application/pdf", "text/*"],
    maxBytes: 10 * 1024 * 1024,
  },
});
