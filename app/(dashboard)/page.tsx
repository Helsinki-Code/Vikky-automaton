"use client";

import { useEveAgent } from "eve/react";
import type { EveDynamicToolPart, EveMessagePart } from "eve/react";
import { useMemo, useRef, useState, useEffect, type FormEvent } from "react";

type Vitals = {
  balanceCents?: number;
  balanceUsd?: string;
  survivalTier?: string;
  soulVersion?: number;
  memoryCount?: number;
};

/** Pulls the most recent check_vitals / system_synopsis tool output out of the message stream. */
function useLatestVitals(parts: readonly EveMessagePart[]): Vitals | null {
  return useMemo(() => {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.type !== "dynamic-tool" || part.state !== "output-available") continue;
      if (part.toolName === "check_vitals") {
        return part.output as Vitals;
      }
      if (part.toolName === "system_synopsis") {
        const output = part.output as { financial?: Vitals; soul?: { version?: number }; memory?: { totalEntries?: number } };
        return {
          balanceCents: output.financial?.balanceCents,
          survivalTier: output.financial?.survivalTier,
          soulVersion: output.soul?.version,
          memoryCount: output.memory?.totalEntries,
        };
      }
    }
    return null;
  }, [parts]);
}

function allParts(messages: readonly { parts: readonly EveMessagePart[] }[]): EveMessagePart[] {
  return messages.flatMap((m) => m.parts);
}

function ToolCallBadge({ part }: { part: EveDynamicToolPart }) {
  const label =
    part.state === "output-available"
      ? "done"
      : part.state === "output-error"
        ? "error"
        : part.state === "output-denied"
          ? "denied"
          : part.state === "approval-requested"
            ? "awaiting approval"
            : "running";
  return (
    <div className="tool-call">
      {part.toolName}({JSON.stringify(part.state === "input-streaming" ? part.input : (part as any).input ?? {})}) →{" "}
      {label}
    </div>
  );
}

function ApprovalCard({
  part,
  onRespond,
}: {
  part: EveDynamicToolPart & { state: "approval-requested" };
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const request = part.toolMetadata?.eve?.inputRequest;
  if (!request) return null;
  return (
    <div className="approval-card">
      <div className="prompt">
        <strong>{part.toolName}</strong> needs your approval — {request.prompt}
      </div>
      <div className="options">
        {(request.options ?? [
          { id: "approve", label: "Approve", style: "primary" as const },
          { id: "deny", label: "Deny", style: "danger" as const },
        ]).map((opt) => (
          <button
            key={opt.id}
            className={opt.style === "primary" ? "primary" : opt.style === "danger" ? "danger" : ""}
            onClick={() => onRespond(request.requestId, opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function tierClass(tier?: string): string {
  return `tier-badge tier-${tier ?? "normal"}`;
}

export default function ChatPage() {
  const agent = useEveAgent({ host: "/api/eve-proxy" });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const parts = allParts(agent.data.messages);
  const vitals = useLatestVitals(parts);
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [agent.data.messages]);

  function respondToApproval(requestId: string, optionId: string) {
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || isBusy) return;
    setInput("");
    void agent.send({ message });
  }

  function refreshStatus() {
    if (isBusy) return;
    void agent.send({ message: "Call system_synopsis and summarize the result." });
  }

  return (
    <div className="chat-shell">
      <aside className="sidebar">
        <div>
          <p className="subtitle">
            <span className={`status-dot ${agent.status === "error" ? "error" : isBusy ? "busy" : "ready"}`} />
            {agent.status}
          </p>
        </div>

        <div className="card">
          <h2>Vitals</h2>
          {vitals ? (
            <>
              <div className="stat-row">
                <span className="label">Balance</span>
                <span>{vitals.balanceUsd ?? (vitals.balanceCents != null ? `$${(vitals.balanceCents / 100).toFixed(2)}` : "—")}</span>
              </div>
              <div className="stat-row">
                <span className="label">Survival tier</span>
                <span className={tierClass(vitals.survivalTier)}>{vitals.survivalTier ?? "—"}</span>
              </div>
              {vitals.soulVersion != null && (
                <div className="stat-row">
                  <span className="label">Soul version</span>
                  <span>{vitals.soulVersion}</span>
                </div>
              )}
              {vitals.memoryCount != null && (
                <div className="stat-row">
                  <span className="label">Memories</span>
                  <span>{vitals.memoryCount}</span>
                </div>
              )}
            </>
          ) : (
            <p className="subtitle">No data yet — ask a question or refresh.</p>
          )}
          <div style={{ marginTop: 10 }}>
            <button className="ghost" onClick={refreshStatus} disabled={isBusy}>
              Refresh status
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Quick actions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="ghost" disabled={isBusy} onClick={() => void agent.send({ message: "Call check_wallet." })}>
              Show wallet address
            </button>
            <button className="ghost" disabled={isBusy} onClick={() => void agent.send({ message: "Call list_children." })}>
              List children
            </button>
            <button className="ghost" disabled={isBusy} onClick={() => void agent.send({ message: "Call read_soul." })}>
              Read soul
            </button>
          </div>
        </div>

        <div className="card">
          <h2>About</h2>
          <p className="subtitle">
            Talking to this agent talks directly to its durable eve session — every approval you see here (deposits,
            withdrawals, self-modification, domain purchases) is a real gate, not a demo.
          </p>
        </div>
      </aside>

      <main className="chat-column">
        <div className="chat-scroll" ref={scrollRef}>
          {agent.data.messages.length === 0 && (
            <p className="empty-state">Say hello, or try &quot;Call system_synopsis&quot;.</p>
          )}
          {agent.data.messages.map((message) => (
            <div key={message.id}>
              {message.parts.map((part, i) => {
                if (part.type === "text" && part.text) {
                  return (
                    <div key={i} className={`message ${message.role}`}>
                      <div className="role">{message.role}</div>
                      {part.text}
                    </div>
                  );
                }
                if (part.type === "dynamic-tool") {
                  if (part.state === "approval-requested") {
                    return <ApprovalCard key={i} part={part} onRespond={respondToApproval} />;
                  }
                  return <ToolCallBadge key={i} part={part} />;
                }
                return null;
              })}
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={submit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your automaton…"
            disabled={isBusy}
          />
          <button type="submit" disabled={isBusy || input.trim().length === 0}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
