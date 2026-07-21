"use client";

import { useEffect, useState } from "react";

interface StatusData {
  wallet: { address: string; chainType: string; createdAt: string };
  onChainRegistry: { agentId: string; chain: string; txHash: string; registeredAt: string } | null;
  integrations: Record<string, boolean>;
}

const INTEGRATION_LABELS: Record<string, { label: string; envVars: string; docs?: string }> = {
  routeAuth: { label: "Dashboard login (route auth)", envVars: "ROUTE_AUTH_USERNAME, ROUTE_AUTH_PASSWORD" },
  stripe: { label: "Stripe deposits", envVars: "STRIPE_SECRET_KEY" },
  stripeConnect: { label: "Stripe withdrawals (Connect)", envVars: "STRIPE_CONNECTED_ACCOUNT_ID" },
  cloudflare: { label: "Cloudflare domains/DNS", envVars: "CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID" },
  erc8004: { label: "ERC-8004 on-chain identity", envVars: "RPC_URL, ERC8004_REGISTRY_ADDRESS", docs: "See contracts/README.md" },
  telegram: { label: "Telegram channel", envVars: "TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN" },
  telegramChat: { label: "Telegram status pings", envVars: "TELEGRAM_CHAT_ID" },
  vercelSandbox: { label: "Hosted Vercel Sandbox", envVars: "automatic on Vercel — no env var needed" },
};

export default function SettingsPage() {
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Settings</h1>
        </div>
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card">
        <h2>Identity</h2>
        <div className="stat-row">
          <span className="label">Wallet address</span>
          <code>{data.wallet.address}</code>
        </div>
        <div className="stat-row">
          <span className="label">Chain type</span>
          <span>{data.wallet.chainType}</span>
        </div>
        <div className="stat-row">
          <span className="label">Created</span>
          <span>{new Date(data.wallet.createdAt).toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="label">On-chain registration</span>
          {data.onChainRegistry ? (
            <span className="tier-badge tier-high">agent #{data.onChainRegistry.agentId}</span>
          ) : (
            <span className="tier-badge tier-normal">not registered</span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Integrations</h2>
        <p className="subtitle">
          Live status only — no secret values are ever sent to the browser. Set env vars in{" "}
          <code>.env.local</code> and restart to activate.
        </p>
        <div className="integration-list">
          {Object.entries(INTEGRATION_LABELS).map(([key, meta]) => {
            const configured = data.integrations[key];
            return (
              <div key={key} className="integration-row">
                <div>
                  <div className="integration-name">{meta.label}</div>
                  <div className="dim small">
                    {meta.envVars}
                    {meta.docs ? ` — ${meta.docs}` : ""}
                  </div>
                </div>
                <span className={`tier-badge ${configured ? "tier-high" : "tier-critical"}`}>
                  {configured ? "configured" : "not set"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
