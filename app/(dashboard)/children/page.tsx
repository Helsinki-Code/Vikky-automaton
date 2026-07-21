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

function statusClass(status: string): string {
  if (status === "running" || status === "healthy") return "tier-badge tier-high";
  if (status === "dead" || status === "failed") return "tier-badge tier-critical";
  return "tier-badge tier-normal";
}

export default function ChildrenPage() {
  const [data, setData] = useState<ChildrenData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/children");
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
                  <th>Funded</th>
                  <th>Deployment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.children.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <span className={statusClass(c.status)}>{c.status}</span>
                    </td>
                    <td>${(c.fundedAmountCents / 100).toFixed(2)}</td>
                    <td className="dim">{c.deploymentUrl || "not deployed"}</td>
                    <td className="dim">{new Date(c.createdAt).toLocaleString()}</td>
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
