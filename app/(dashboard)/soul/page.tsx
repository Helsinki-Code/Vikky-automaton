"use client";

import { useEffect, useState } from "react";

interface Soul {
  version: number;
  updatedAt: string;
  corePurpose: string;
  values: string[];
  personality: string;
  strategy: string;
  boundaries: string[];
}

interface SoulData {
  soul: Soul;
  previousVersions: number;
}

export default function SoulPage() {
  const [data, setData] = useState<SoulData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/soul");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading || !data) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Soul</h1>
        </div>
        <p className="empty-state">Loading…</p>
      </div>
    );
  }

  const { soul, previousVersions } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Soul</h1>
        <button className="ghost" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <h2>Version</h2>
          <div className="big-stat">v{soul.version}</div>
        </div>
        <div className="card stat-card">
          <h2>Previous versions</h2>
          <div className="big-stat">{previousVersions}</div>
        </div>
        <div className="card stat-card">
          <h2>Last updated</h2>
          <div className="big-stat small">{new Date(soul.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <h2>Core purpose</h2>
        <p>{soul.corePurpose}</p>
      </div>

      <div className="card">
        <h2>Personality</h2>
        <p>{soul.personality}</p>
      </div>

      <div className="card">
        <h2>Strategy</h2>
        <p>{soul.strategy}</p>
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Values</h2>
          <ul className="bullet-list">
            {soul.values.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Boundaries</h2>
          <ul className="bullet-list">
            {soul.boundaries.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="subtitle">
        The soul evolves via <code>update_soul</code> (always approved) — this page is read-only.
        The Constitution itself is not part of the soul and cannot be changed from here or anywhere.
      </p>
    </div>
  );
}
