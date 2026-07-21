"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  amountCents?: number;
  balanceAfterCents?: number;
  description: string;
  timestamp: string;
}

interface LedgerData {
  balanceCents: number;
  survivalTier: string;
  createdAt: string;
  transactions: Transaction[];
}

function formatUsd(cents?: number): string {
  if (cents == null) return "—";
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function tierClass(tier?: string): string {
  return `tier-badge tier-${tier ?? "normal"}`;
}

export default function LedgerPage() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ledger");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ledger</h1>
        <button className="ghost" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {data && (
        <div className="stat-grid">
          <div className="card stat-card">
            <h2>Balance</h2>
            <div className="big-stat">{formatUsd(data.balanceCents)}</div>
          </div>
          <div className="card stat-card">
            <h2>Survival tier</h2>
            <div className="big-stat">
              <span className={tierClass(data.survivalTier)}>{data.survivalTier}</span>
            </div>
          </div>
          <div className="card stat-card">
            <h2>Born</h2>
            <div className="big-stat small">{new Date(data.createdAt).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Transaction history</h2>
        {!data || data.transactions.length === 0 ? (
          <p className="empty-state">{loading ? "Loading…" : "No transactions yet."}</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="dim">{new Date(t.timestamp).toLocaleString()}</td>
                    <td>
                      <span className="pill">{t.type}</span>
                    </td>
                    <td className={t.amountCents != null && t.amountCents < 0 ? "negative" : "positive"}>
                      {formatUsd(t.amountCents)}
                    </td>
                    <td>{formatUsd(t.balanceAfterCents)}</td>
                    <td className="dim">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
