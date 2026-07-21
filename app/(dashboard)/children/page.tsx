"use client";

import { useEffect, useState } from "react";

interface Child {
  id: string;
  name: string;
  deploymentUrl?: string;
  fundedAmountCents: number;
  status: string;
  createdAt: string;
  lastChecked?: string;
}

interface ChildrenData {
  children: Child[];
  total: number;
  alive: number;
}

interface ReputationEntry {
  id: string;
  toAgent: string;
  score: number;
  comment: string;
  timestamp: string;
}

interface ReputationData {
  entries: ReputationEntry[];
  byAgent: Record<string, { count: number; averageScore: number }>;
}

function statusClass(status: string): string {
  if (status === "running" || status === "healthy") return "tier-badge tier-high";
  if (status === "dead" || status === "failed") return "tier-badge tier-critical";
  return "tier-badge tier-normal";
}

function ChildRow({ child, onChecked }: { child: Child; onChecked: () => void }) {
  const [checking, setChecking] = useState(false);

  async function checkNow() {
    setChecking(true);
    try {
      await fetch("/api/children/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ childId: child.id }),
      });
      onChecked();
    } finally {
      setChecking(false);
    }
  }

  return (
    <tr>
      <td>{child.name}</td>
      <td>
        <span className={statusClass(child.status)}>{child.status}</span>
      </td>
      <td>${(child.fundedAmountCents / 100).toFixed(2)}</td>
      <td className="dim">{child.deploymentUrl || "not deployed"}</td>
      <td className="dim">{new Date(child.createdAt).toLocaleString()}</td>
      <td className="dim">{child.lastChecked ? new Date(child.lastChecked).toLocaleString() : "never"}</td>
      <td>
        <button className="ghost" style={{ padding: "4px 10px", fontSize: 12 }} disabled={checking} onClick={checkNow}>
          {checking ? "Checking…" : "Check now"}
        </button>
      </td>
    </tr>
  );
}

function ReputationCard({ data }: { data: ReputationData | null }) {
  if (!data || data.entries.length === 0) {
    return (
      <div className="card">
        <h2>Reputation</h2>
        <p className="empty-state">No feedback recorded yet.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h2>Reputation</h2>
      <div className="integration-list" style={{ marginBottom: 12 }}>
        {Object.entries(data.byAgent).map(([agent, stats]) => (
          <div key={agent} className="integration-row">
            <div>
              <div className="integration-name">{agent}</div>
              <div className="dim small">{stats.count} feedback entries</div>
            </div>
            <span className={`tier-badge ${stats.averageScore >= 0 ? "tier-high" : "tier-critical"}`}>
              {stats.averageScore.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Agent</th>
              <th>Score</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.slice(0, 10).map((e) => (
              <tr key={e.id}>
                <td className="dim">{new Date(e.timestamp).toLocaleString()}</td>
                <td>{e.toAgent}</td>
                <td className={e.score >= 0 ? "positive" : "negative"}>{e.score.toFixed(2)}</td>
                <td className="dim">{e.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ChildrenPage() {
  const [data, setData] = useState<ChildrenData | null>(null);
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [childrenRes, reputationRes] = await Promise.all([fetch("/api/children"), fetch("/api/reputation")]);
      setData(await childrenRes.json());
      setReputation(await reputationRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totalFundedCents = data?.children.reduce((sum, c) => sum + c.fundedAmountCents, 0) ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Children</h1>
        <button className="ghost" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {data && (
        <div className="stat-grid">
          <div className="card stat-card">
            <h2>Total spawned</h2>
            <div className="big-stat">{data.total}</div>
          </div>
          <div className="card stat-card">
            <h2>Alive</h2>
            <div className="big-stat">{data.alive}</div>
          </div>
          <div className="card stat-card">
            <h2>Total funded</h2>
            <div className="big-stat">${(totalFundedCents / 100).toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>All children</h2>
        {!data || data.children.length === 0 ? (
          <p className="empty-state">
            {loading ? "Loading…" : "No children spawned yet — use the chat and ask the automaton to spawn_child."}
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Funded (total)</th>
                  <th>Deployment</th>
                  <th>Created</th>
                  <th>Last checked</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.children.map((c) => (
                  <ChildRow key={c.id} child={c} onChecked={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReputationCard data={reputation} />
    </div>
  );
}
