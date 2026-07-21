/**
 * Direct Telegram Bot API calls for outbound alerts — separate from the
 * telegramChannel (agent/channels/telegram.ts), which handles chat sessions.
 * This is one-way: a plain text push to the creator's chat, not a session.
 * Silently no-ops when Telegram isn't configured, same "not configured"
 * pattern used elsewhere (register_erc8004, deploy_service).
 */

export function telegramAlertsConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch {
    // Alerting must never crash the caller — this is a best-effort side channel.
  }
}
