"use client";

import { useEffect, useState } from "react";

interface StatusData {
  wallet: { address: string; chainType: string; createdAt: string };
  onChainRegistry: { agentId: string; chain: string; txHash: string; registeredAt: string } | null;
  integrations: Record<string, boolean>;
}

interface OnChainData {
  evm: boolean;
  address?: string;
  usdcBalance?: number;
  usdcBalanceOk?: boolean;
  usdcBalanceError?: string;
  totalIncomeUsdc?: number;
  recentIncome?: Array<{ id: string; amountUsdc: number; description: string; txHash: string; timestamp: string }>;
}

interface ServiceSummary {
  id: string;
  name: string;
  url: string;
  status: string;
  revenueCents: number;
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
  vercelDeploy: { label: "Service deploys (deploy_service)", envVars: "AUTOMATON_VERCEL_TOKEN" },
  x402: { label: "x402 USDC payments (optional)", envVars: "RPC_URL" },
};

export default function SettingsPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [onchain, setOnchain] = useState<OnChainData | null>(null);
  const [services, setServices] = useState<ServiceSummary[]>([]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setData);
    fetch("/api/onchain")
      .then((r) => r.json())
      .then(setOnchain);
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []));
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

      <div className="card">
        <h2>On-chain (optional — separate from your Stripe ledger)</h2>
        {!onchain ? (
          <p className="empty-state">Loading…</p>
        ) : !onchain.evm ? (
          <p className="empty-state">This automaton&apos;s wallet is not EVM — no USDC-on-Base balance to show.</p>
        ) : (
          <>
            <div className="stat-row">
              <span className="label">USDC balance (Base)</span>
              <span>
                {onchain.usdcBalanceOk ? `${onchain.usdcBalance?.toFixed(2)} USDC` : onchain.usdcBalanceError || "unavailable"}
              </span>
            </div>
            <div className="stat-row">
              <span className="label">Total x402 income received</span>
              <span>{(onchain.totalIncomeUsdc ?? 0).toFixed(2)} USDC</span>
            </div>
            {onchain.recentIncome && onchain.recentIncome.length > 0 && (
              <div className="table-scroll" style={{ marginTop: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Amount</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onchain.recentIncome.map((e) => (
                      <tr key={e.id}>
                        <td className="dim">{new Date(e.timestamp).toLocaleString()}</td>
                        <td className="positive">{e.amountUsdc.toFixed(2)} USDC</td>
                        <td className="dim">{e.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Deployed services</h2>
        {services.length === 0 ? (
          <p className="empty-state">None yet — see the Ledger page once deploy_service has been used.</p>
        ) : (
          <div className="integration-list">
            {services.map((s) => (
              <div key={s.id} className="integration-row">
                <div>
                  <div className="integration-name">{s.name}</div>
                  <div className="dim small">{s.url}</div>
                </div>
                <span className={`tier-badge ${s.status === "active" ? "tier-high" : "tier-critical"}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
