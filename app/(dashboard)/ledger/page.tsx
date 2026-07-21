"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

interface DeployedService {
  id: string;
  name: string;
  url: string;
  status: string;
  createdAt: string;
  revenueCents: number;
  paymentCount: number;
}

const POLL_INTERVAL_MS = 20_000;

function formatUsd(cents?: number): string {
  if (cents == null) return "—";
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function tierClass(tier?: string): string {
  return `tier-badge tier-${tier ?? "normal"}`;
}

const PRESET_AMOUNTS_CENTS = [500, 1000, 2500, 5000];

function AddFundsCard({ onDeposited }: { onDeposited: () => void }) {
  const [amount, setAmount] = useState("10.00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(cents: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents: cents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      setError("Network error starting checkout.");
      setBusy(false);
    }
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars < 1 || dollars > 1000) {
      setError("Enter an amount between $1 and $1,000.");
      return;
    }
    void startCheckout(Math.round(dollars * 100));
  }

  return (
    <div className="card">
      <h2>Add funds</h2>
      <p className="subtitle" style={{ marginBottom: 12 }}>
        Opens a real Stripe Checkout page. Nothing is charged until you complete payment there — this dashboard
        never sees your card details.
      </p>
      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {PRESET_AMOUNTS_CENTS.map((cents) => (
          <button key={cents} className="ghost" disabled={busy} onClick={() => startCheckout(cents)}>
            {formatUsd(cents)}
          </button>
        ))}
      </div>
      <form onSubmit={submitCustom} style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          min="1"
          max="1000"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--panel-border)",
            borderRadius: 8,
            color: "var(--text)",
            padding: "8px 12px",
            fontSize: 14,
            width: 120,
          }}
        />
        <button className="ghost" type="submit" disabled={busy}>
          {busy ? "Redirecting…" : "Custom amount"}
        </button>
      </form>
    </div>
  );
}

function WithdrawCard({ balanceCents, onWithdrawn }: { balanceCents: number; onWithdrawn: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function startConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const dollars = parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (dollars * 100 > balanceCents) {
      setError(`Only ${formatUsd(balanceCents)} is available.`);
      return;
    }
    if (reason.trim().length < 5) {
      setError("Give a short reason (at least 5 characters).");
      return;
    }
    setConfirming(true);
  }

  async function confirmWithdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents: Math.round(parseFloat(amount) * 100), reason, confirmed: true }),
      });
      const data = await res.json();
      if (!data.sent) {
        setError(data.reason || data.error || "Withdrawal failed.");
        setConfirming(false);
        return;
      }
      setResult(`Sent ${formatUsd(data.amountCents)} — new balance ${formatUsd(data.newBalanceCents)}.`);
      setConfirming(false);
      setAmount("");
      setReason("");
      onWithdrawn();
    } catch {
      setError("Network error sending withdrawal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Withdraw</h2>
      <p className="subtitle" style={{ marginBottom: 12 }}>
        Pays out from the ledger to your Stripe Connect account. This moves real money and cannot be undone —
        requires a second confirmation below, same as the chat tool's approval gate.
      </p>
      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
      {result && (
        <div className="card" style={{ background: "rgba(62,207,142,0.08)", borderColor: "var(--good)", marginBottom: 12 }}>
          {result}
        </div>
      )}
      {!confirming ? (
        <form onSubmit={startConfirm} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount ($)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--panel-border)",
              borderRadius: 8,
              color: "var(--text)",
              padding: "8px 12px",
              fontSize: 14,
              width: 120,
            }}
          />
          <input
            type="text"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--panel-border)",
              borderRadius: 8,
              color: "var(--text)",
              padding: "8px 12px",
              fontSize: 14,
              flex: 1,
              minWidth: 160,
            }}
          />
          <button className="ghost" type="submit">
            Withdraw
          </button>
        </form>
      ) : (
        <div className="approval-card" style={{ maxWidth: "none" }}>
          <div className="prompt">
            Confirm: withdraw <strong>${parseFloat(amount).toFixed(2)}</strong> for &ldquo;{reason}&rdquo;? This
            cannot be undone.
          </div>
          <div className="options">
            <button className="primary" disabled={busy} onClick={confirmWithdraw}>
              {busy ? "Sending…" : "Yes, withdraw"}
            </button>
            <button className="danger" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DepositReturnBanner({ onConfirmed }: { onConfirmed: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "success" | "cancelled" | "error" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const deposit = params.get("deposit");
    const sessionId = params.get("session_id");
    if (deposit === "cancelled") {
      setStatus("cancelled");
      return;
    }
    if (deposit === "success" && sessionId) {
      setStatus("checking");
      fetch("/api/deposit/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkoutSessionId: sessionId }),
      })
        .then((r) => r.json())
        .then((result) => {
          if (result.credited) {
            setStatus("success");
            setMessage(`$${(result.amountCents / 100).toFixed(2)} added — new balance $${(result.newBalanceCents / 100).toFixed(2)}.`);
            onConfirmed();
          } else {
            setStatus("error");
            setMessage(result.reason || "Could not confirm payment.");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Network error confirming payment.");
        })
        .finally(() => {
          router.replace("/ledger");
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!status) return null;
  const styles: Record<string, string> = {
    checking: "tier-normal",
    success: "tier-high",
    cancelled: "tier-low_compute",
    error: "tier-critical",
  };
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <span className={`tier-badge ${styles[status]}`}>{status}</span>
      <span style={{ marginLeft: 10 }}>
        {status === "checking" && "Confirming your payment with Stripe…"}
        {status === "success" && message}
        {status === "cancelled" && "Checkout was cancelled — no charge was made."}
        {status === "error" && message}
      </span>
    </div>
  );
}

function DeployedServicesCard({ services }: { services: DeployedService[] }) {
  if (services.length === 0) {
    return (
      <div className="card">
        <h2>Deployed services</h2>
        <p className="empty-state">None yet — deploy_service publishes a real, public URL here once used.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h2>Deployed services</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Revenue</th>
              <th>Payments</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  <span className={`pill ${s.status === "active" ? "positive" : "negative"}`}>{s.status}</span>
                </td>
                <td className="positive">{formatUsd(s.revenueCents)}</td>
                <td className="dim">{s.paymentCount}</td>
                <td className="dim">
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.url.replace(/^https?:\/\//, "")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TX_FILTERS = ["all", "deposit", "upkeep", "transfer_out", "adjustment"] as const;

function LedgerContent() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [services, setServices] = useState<DeployedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<(typeof TX_FILTERS)[number]>("all");

  async function load() {
    setLoading(true);
    try {
      const [ledgerRes, servicesRes] = await Promise.all([fetch("/api/ledger"), fetch("/api/services")]);
      setData(await ledgerRes.json());
      const servicesData = await servicesRes.json();
      setServices(servicesData.services ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const filteredTransactions = data?.transactions.filter((t) => txFilter === "all" || t.type === txFilter) ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ledger</h1>
        <button className="ghost" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <Suspense fallback={null}>
        <DepositReturnBanner onConfirmed={load} />
      </Suspense>

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

      <AddFundsCard onDeposited={load} />
      {data && <WithdrawCard balanceCents={data.balanceCents} onWithdrawn={load} />}

      <DeployedServicesCard services={services} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h2>Transaction history</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TX_FILTERS.map((f) => (
              <button
                key={f}
                className="ghost"
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  opacity: txFilter === f ? 1 : 0.55,
                }}
                onClick={() => setTxFilter(f)}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>
        {!data || filteredTransactions.length === 0 ? (
          <p className="empty-state">
            {loading ? "Loading…" : txFilter === "all" ? "No transactions yet — add funds above to get started." : `No ${txFilter} transactions yet.`}
          </p>
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
                {filteredTransactions.map((t) => (
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

export default function LedgerPage() {
  return (
    <Suspense fallback={null}>
      <LedgerContent />
    </Suspense>
  );
}
