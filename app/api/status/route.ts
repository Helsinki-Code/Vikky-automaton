import { NextResponse } from "next/server";
import { getOrCreateWallet } from "../../../agent/lib/wallet";
import { getRegistryEntry } from "../../../agent/lib/registry";

/** Presence-only — never returns the actual secret values to the browser. */
export async function GET() {
  const wallet = await getOrCreateWallet();
  return NextResponse.json({
    wallet: { address: wallet.address, chainType: wallet.chainType, createdAt: wallet.createdAt },
    onChainRegistry: (await getRegistryEntry()) ?? null,
    integrations: {
      routeAuth: !!(process.env.ROUTE_AUTH_USERNAME && process.env.ROUTE_AUTH_PASSWORD),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      stripeConnect: !!process.env.STRIPE_CONNECTED_ACCOUNT_ID,
      cloudflare: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
      erc8004: !!(process.env.RPC_URL && process.env.ERC8004_REGISTRY_ADDRESS),
      telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN),
      telegramChat: !!process.env.TELEGRAM_CHAT_ID,
      // Not an env var to configure — eve's defaultBackend() auto-selects
      // Vercel Sandbox whenever running on Vercel (process.env.VERCEL is set
      // by the platform itself), using Vercel's own ambient credentials.
      // Nothing reads a manual VERCEL_TOKEN/VERCEL_TEAM_ID in this project.
      vercelSandbox: !!process.env.VERCEL,
      // Distinct from the platform's own deploy — this is the automaton's
      // own token for deploy_service, letting it publish its own paid
      // services as separate Vercel projects.
      vercelDeploy: !!process.env.AUTOMATON_VERCEL_TOKEN,
    },
  });
}
