import { NextResponse } from "next/server";
import { getOrCreateWallet } from "../../../agent/lib/wallet";
import { getRegistryEntry } from "../../../agent/lib/registry";

/** Presence-only — never returns the actual secret values to the browser. */
export async function GET() {
  const wallet = getOrCreateWallet();
  return NextResponse.json({
    wallet: { address: wallet.address, chainType: wallet.chainType, createdAt: wallet.createdAt },
    onChainRegistry: getRegistryEntry() ?? null,
    integrations: {
      routeAuth: !!(process.env.ROUTE_AUTH_USERNAME && process.env.ROUTE_AUTH_PASSWORD),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      stripeConnect: !!process.env.STRIPE_CONNECTED_ACCOUNT_ID,
      cloudflare: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
      erc8004: !!(process.env.RPC_URL && process.env.ERC8004_REGISTRY_ADDRESS),
      telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN),
      telegramChat: !!process.env.TELEGRAM_CHAT_ID,
      vercelSandbox: !!(process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID),
    },
  });
}
