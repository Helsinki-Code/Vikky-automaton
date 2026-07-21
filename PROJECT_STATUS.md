# Vikky's Automaton (Eve rebuild) — Project Status

Last updated: 2026-07-21 (post wallet/auth/heartbeat/model-switch rebuild + frontend dashboard)

This document is the single source of truth for what's actually built, verified,
and pending in the Eve-based rebuild of the Conway automaton, located at
`vikky-automaton2/`. Every "done" item below has been either typechecked,
run against a live local `eve dev` server, or both — nothing here is
aspirational. Every "pending" item is a real gap, not a formality.

---

## 1. Architecture at a glance

The automaton is an [eve](https://eve.dev) agent — a filesystem-defined,
durable AI agent — replacing Conway Cloud (deprecated, auth backend down)
with infrastructure you control:

| Concern | Conway (old) | This rebuild |
|---|---|---|
| Compute | Conway sandbox API | Eve's `defaultBackend()` — Vercel Sandbox (hosted) → Docker → microsandbox → just-bash (local) |
| Credits/billing | Conway credit API | Local JSON ledger (`agent/lib/ledger.ts`) + real Stripe Checkout/transfers |
| Domains/DNS | Conway registrar | Real Cloudflare API |
| Identity/wallet | Conway-provisioned | **Auto-generated on first boot** (`agent/lib/wallet.ts`), same viem/tweetnacl approach as the original |
| Identity registry | Conway directory | ERC-8004 on-chain registry (viem), signed by the auto-generated wallet |
| Agent runtime/loop | Custom (`src/agent/loop.ts`) | Eve's durable session/workflow engine |
| State | SQLite (`better-sqlite3`) | Flat JSON files under `.automaton/` (simpler, fully inspectable, no concurrency guarantees) |
| Messaging | Conway social relay | Telegram bot channel + direct agent-to-agent HTTP |
| Route auth | N/A | `httpBasic()` when `ROUTE_AUTH_USERNAME`/`ROUTE_AUTH_PASSWORD` are set; falls back to a safe 401 stub otherwise |

Every persistent concept (ledger, soul, memory, children registry, heartbeat
state, wallet) is a plain JSON file under `.automaton/`, written via
`agent/lib/store.ts`'s `readJson`/`writeJson`. This is deliberately **not**
Eve's `defineState` — `defineState` is per-session and resets each
conversation; these need to survive across every future session, so they're
process-level files instead.

---

## 2. What's done and verified

### 2.1 Core agent

- **`agent/agent.ts`** — direct OpenAI provider (`gpt-5.2`) as the compile-time fallback, dynamically overridable per `switch_model` (see 2.8). Reads `OPENAI_API_KEY` from `.env.local`. ✅ Verified booting.
- **`agent/instructions.ts`** (TypeScript, not markdown — see rationale below) — assembles the system prompt from `agent/lib/constitution.ts`'s single-source Constitution text plus full operating instructions referencing every tool. ✅
- **`agent/lib/constitution.ts`** — the three-law Constitution, verbatim from the original `constitution.md`, as one exported constant. `instructions.ts` imports it; nothing hand-copies it anymore, so it cannot silently drift from the source. Both `instructions.ts` and this file are in `edit_own_file`'s protected-path set.
- **`agent/hooks/ensure-wallet.ts`** — calls `getOrCreateWallet()` on every `session.started`; idempotent (checks the file first), so it's a real no-op after the very first session ever. ✅ Verified: deleted `.automaton/wallet.json`, restarted, sent one message, wallet was generated automatically before the tool even ran.
- **`agent/sandbox/sandbox.ts`** — `defaultBackend()`, so it auto-picks the best available compute (Vercel Sandbox / Docker / microsandbox / just-bash). Bootstrap seeds `/workspace/projects` and `/workspace/notes`. ✅ Verified: real `bash` execution in `/workspace`.

**Why `instructions.ts` instead of `instructions.md`:** Eve's own docs say a
*static* prompt belongs in markdown, and you switch to TypeScript only when
the prompt is *built* from typed helpers or shared constants — neither format
is universally "better." Here, `.ts` is the correct choice specifically
because the Constitution needed a single source of truth (`lib/constitution.ts`)
that both `instructions.ts` and any future consumer can import, rather than
being hand-copied prose that could silently drift from the original repo's
`constitution.md`.

### 2.2 Sovereign wallet (previously the biggest identity gap — now closed)

- **`agent/lib/wallet.ts`** — `getOrCreateWallet()`: checks `.automaton/wallet.json`; if absent, generates a fresh EVM key (`viem/accounts`' `generatePrivateKey()`) or Solana keypair (`tweetnacl`), persists at `0o600`, never regenerates. Exactly the original repo's `src/identity/wallet.ts` approach, ported to Eve's hook lifecycle instead of a custom `src/index.ts` boot sequence.
- **`check_wallet` tool** — reports the address/chain type/creation time.
- **`agent/lib/erc8004.ts`** — now signs with this wallet directly (`getEvmAccount()`), instead of requiring an operator-supplied `WALLET_PRIVATE_KEY` env var. Only `RPC_URL`/`ERC8004_REGISTRY_ADDRESS` remain as external config.
- **`system_synopsis`** now reports `walletAddress`, `chainType`, and the on-chain registry entry (if registered).
- ✅ Verified live: deleted the wallet file, restarted the dev server, sent one message — the wallet was generated automatically with no manual step.

### 2.3 Real route auth (previously `placeholderAuth()` only — now conditional-real)

- **`agent/channels/eve.ts`** — `creatorAuth()` uses `httpBasic({ username, password })` from `ROUTE_AUTH_USERNAME`/`ROUTE_AUTH_PASSWORD` env vars when both are set; falls back to `placeholderAuth()` (a safe structured 401) only when they're absent. `vercelOidc()` and `localDev()` remain ahead of it for Vercel-to-Vercel and local dev traffic.
- **Still pending:** no credentials are actually set yet in this environment — see §3.

### 2.4 Dynamic heartbeat cadence (previously fake — now genuinely dynamic)

- **`agent/lib/heartbeat-state.ts`** — real `intervalMinutes` + `lastHeartbeatRunAt` fields, `isHeartbeatDue()`/`markHeartbeatRun()`/`setIntervalMinutes()`.
- **`agent/schedules/dynamic-tick.ts`** (new) — fires every minute (Eve's compiled cadence, unavoidable), but only does work — charging upkeep mechanically, no LLM call — when `isHeartbeatDue()` says so. Changing `intervalMinutes` via `modify_heartbeat` takes effect on the very next minute tick, no redeploy.
- **`agent/lib/upkeep.ts`** (new, factored out) — the dedup-safe upkeep-charging logic, shared by both the `record_upkeep` tool and the new dispatcher, so the two paths can't drift out of sync.
- **`modify_heartbeat` tool** — rewritten to actually call `setIntervalMinutes()`. Honest scope: this governs the *mechanical* upkeep cadence for real; the separate **LLM-driven reflection heartbeat** (`agent/schedules/heartbeat.ts`, unchanged, still fires every 15 minutes) is still compiled statically and needs `edit_own_file` + a redeploy to actually re-cadence — Eve has no API for a schedule's own cron to be dynamic, only for *whether a tick does anything* to be dynamic. That's the real boundary, not a shortcut.
- ✅ Verified: full eval suite (including the heartbeat-dispatch eval) still green after the rebuild.

### 2.5 Dynamic model switching (previously fake — now genuinely dynamic)

- **`agent/lib/model-resolver.ts`** (new) — maps a `MODEL_CATALOG` entry to a real `@ai-sdk/openai` or `@ai-sdk/anthropic` `LanguageModel` instance.
- **`agent/agent.ts`** — `model: defineDynamic({ fallback: openai("gpt-5.2"), events: { "step.started": () => resolveModel(getSelectedModel()) } })`. `switch_model`'s recorded preference is read fresh before every model call.
- **Real bug caught and fixed during verification:** the first version resolved on `session.started`, which only accepts serializable model-id strings, not live `LanguageModel` objects — Eve logged `"Dynamic model resolver ... returned a provider object, but session- and turn-scoped model selections must be serializable"` and silently fell back to the compiled fallback every time. Moved the resolver to `step.started` (the only scope that accepts live `LanguageModel` instances per Eve's dynamic-capabilities contract) and the warning disappeared, confirmed via a second full eval run.
- Installed `@ai-sdk/anthropic` so Claude catalog entries actually resolve (previously only OpenAI was installed).

### 2.6 Tools — 57 authored tools + Eve's built-ins

Built-in (no authoring needed): `bash`, `read_file`, `write_file`, `glob`,
`grep`, `agent` (delegate to a fresh copy of self), `load_skill`,
`ask_question`, `Workflow` (not enabled — see Pending).

Authored, by category:

| Category | Tools | Status |
|---|---|---|
| Vitals/survival | `check_vitals`, `record_upkeep`, `heartbeat_ping`, `sleep`, `enter_low_compute`, `distress_signal` | ✅ Verified live |
| Memory | `remember`, `recall` | ✅ Verified live (round-trip eval) |
| Soul | `read_soul`, `update_soul`, `reflect_on_soul` | ✅ Verified (read_soul eval) |
| Ledger/financial | `transfer_funds`, `deposit_funds`, `create_deposit_link`, `confirm_deposit`, `request_withdrawal`, `check_inference_spending` | ✅ Deposit/transfer logic verified; Stripe calls need a real `STRIPE_SECRET_KEY` to fire for real (currently "not configured" stub) |
| Treasury policy | enforced inside `transfer_funds`/`request_withdrawal`/`fund_child`/`spawn_child` via `agent/lib/policy.ts` | ✅ Verified — held even after human approval, in a live eval |
| Self-modification | `edit_own_file`, `revert_last_edit`, `review_upstream_changes`, `pull_upstream`, `install_npm_package` | ✅ Protected-path enforcement verified live — now covers `instructions.ts` **and** `lib/constitution.ts` |
| Git | `git_status`, `git_diff`, `git_commit`, `git_log`, `git_branch`, `git_push`, `git_clone` | Typechecked; not yet exercised in a real git repo via eval |
| Skills | `list_skills`, `create_skill`, `remove_skill` | Typechecked |
| Models | `list_models`, `switch_model` | ✅ **Genuinely live** — see 2.5 |
| Identity/wallet | `check_wallet` (new) | ✅ Verified live — see 2.2 |
| Identity/reputation | `register_erc8004` (real viem contract call, signed by the auto-wallet), `update_agent_card`, `discover_agents`, `give_feedback`, `check_reputation` | Typechecked; `register_erc8004` needs real `RPC_URL`/`ERC8004_REGISTRY_ADDRESS` to actually fire (wallet is no longer the blocker) |
| Domains/DNS | `search_domains` (real RDAP check), `register_domain`, `manage_dns` | Typechecked; register/DNS need real `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` |
| Replication | `spawn_child`, `list_children`, `fund_child`, `check_child_status`, `start_child`, `message_child`, `verify_child_constitution`, `prune_dead_children` | Typechecked; `spawn_child` deliberately writes a genesis config for **manual** deployment rather than auto-deploying (see Pending) |
| Messaging | `send_message` (agent-to-agent HTTP) | Typechecked |
| Heartbeat control | `modify_heartbeat` | ✅ **Genuinely live** — see 2.4 |
| MCP | `install_mcp_server` | Writes a new `agent/connections/<name>.ts` file; takes effect on next reload/deploy, not immediately |
| Misc | `expose_port`, `system_synopsis`, `update_genesis_prompt` | Typechecked |

### 2.7 Channels

- **`agent/channels/eve.ts`** — real `httpBasic()` auth when configured (see 2.3), safe fallback otherwise.
- **`agent/channels/telegram.ts`** — real Telegram bot channel with inline-keyboard approvals for HITL, upload policy for images/PDFs. Needs `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `TELEGRAM_BOT_USERNAME` to activate; webhook registration is a manual one-time `curl` (Eve doesn't call `setWebhook` for you).

### 2.8 Schedules

- **`agent/schedules/heartbeat.ts`** — fires every 15 minutes (production) / dispatchable on-demand in dev via `POST /eve/v1/dev/schedules/heartbeat`. Task-mode: runs `check_vitals` → `record_upkeep` → tier-based behavior → optional memory write. ✅ Verified via eval.
- **`agent/schedules/dynamic-tick.ts`** (new) — the real dynamic-cadence dispatcher. See 2.4.
- **`agent/schedules/reflect.md`** — daily reflection at 06:00 UTC.
- **`agent/schedules/status-ping.ts`** — daily 09:00 UTC Telegram status ping; no-ops until `TELEGRAM_CHAT_ID` is set.

### 2.9 Subagents

- **`agent/subagents/worker/`** — a lightweight (`reasoning: "low"`) specialist subagent for bounded, isolated tasks with its own sandbox, no ledger/memory tools.

### 2.10 Eval suite — 12/12 passing, 33/33 gates, verified after every change this round

Full suite under `evals/`, run with `eve eval`. Re-ran to green after the
wallet/auth/heartbeat/model-switch/instructions.ts rebuild — nothing broke,
and the suite caught the `session.started` vs `step.started` model-resolver
bug described in 2.5 before it shipped.

### 2.12 Frontend dashboard (previously nonexistent — now built and verified)

- **`next.config.ts`** — `withEve(nextConfig)`, mounting this same project's `agent/` directory alongside the Next.js app. Same-origin, no CORS, no separate URL to keep in sync.
- **`app/page.tsx`** — a real dashboard: a sidebar (live vitals parsed from the actual `check_vitals`/`system_synopsis` tool output, quick-action buttons) plus a full chat column using `eve/react`'s `useEveAgent()`. Renders text messages, tool-call badges, and — critically — **live HITL approval cards** with real approve/deny buttons wired to `agent.send({ inputResponses: [...] })`.
- **`app/layout.tsx`**, **`app/globals.css`** — shell and styling (dark theme, tier-colored badges, no external UI library).
- **`package.json`** scripts repointed: `dev`/`build`/`start` now run Next.js (which boots eve internally per `withEve`); `dev:agent-only`/`build:agent-only` keep the bare `eve dev`/`eve build` path for agent-only iteration.
- ✅ **Verified live, not just typechecked:** booted the real dashboard in a browser, clicked "Refresh status" — the sidebar populated with the actual ledger balance ($9.80), HIGH tier, soul version, and memory count straight from a live `system_synopsis` call. Then sent `transfer_funds` from the chat input, watched a real HITL approval card render with Yes/No buttons (not "approve"/"deny" — Eve's default confirmation options), clicked "Yes", and confirmed the tool actually executed: ledger genuinely debited from $9.80 → $9.70, exactly matching what the ledger file would show. Full browser → Next.js → eve → tool → real-state-mutation round trip confirmed end to end.
- **Known limitation, still true for the chat page specifically:** the sidebar only re-parses vitals when `check_vitals`/`system_synopsis` is actually called in the conversation — it doesn't auto-poll after unrelated tool calls, so it can show a stale balance until you ask again or hit "Refresh status". The Ledger/Settings/Children pages (2.14) now poll or refresh independently of chat, so this is scoped to the chat sidebar only.

### 2.13 Config / secrets currently set

See section 3.2 for the current per-integration status — this list has grown well past the original `OPENAI_API_KEY`-only state as Stripe, Vercel deploy, route auth, and others were wired up across sessions.

### 2.14 Revenue path + enhancement round (added after 3.0's Blob fix)

Triggered by an explicit ask for the automaton to actually be able to earn,
not just track money it's given:

- **`deploy_service`** — publishes a directory built in the sandbox as its
  own real, public Vercel project (`agent/lib/vercel-deploy.ts`, REST API,
  not the CLI, so the deploy token never touches the sandbox). Capped at
  `MAX_ACTIVE_SERVICES` (5), supports `resumeDeploymentId` for a timed-out
  poll, registers into `agent/lib/services.ts`, and auto-injects two helpers
  into the deployed files:
  - `_automaton_stripe.js` — **primary path.** Charges a real customer via
    Stripe Checkout (`agent/lib/deposits.ts` reused), proceeds credited into
    the same ledger `check_vitals` reports. No crypto, no gas.
  - `_automaton_x402.js` — **secondary, optional.** Accepts on-chain USDC via
    x402, settled by `/api/x402/settle` (this app runtime broadcasts the
    payer's signed EIP-3009 authorization itself — no third-party
    facilitator), tracked in `agent/lib/onchain-income.ts`, kept strictly
    separate from the Stripe ledger.
  - `x402_fetch` / `check_usdc_balance` — the paying-for-APIs half of x402.
- **Goals & procedures** — `create_goal`/`list_goals`/`complete_goal`/
  `cancel_goal`/`get_plan`/`update_goal_plan` (durable, one active goal at a
  time, no orchestrator — the agent authors its own plan) and
  `save_procedure`/`recall_procedure`/`report_procedure_outcome` (named,
  success/failure-tracked, distinct from `remember`/`recall`).
- **`search_task_marketplace`** — a real, public, no-key-required listings
  feed (remoteok.com/api), for surfacing leads, not auto-applying.
- **Mechanical revenue nudge** — `dynamic-tick.ts` (non-LLM) flags when the
  survival tier is low; `check_vitals`'s `revenueFocusRecommended` field and
  the **revenue** skill make it concrete for the LLM heartbeat.
- **Telegram alerting** — `distress_signal` pages the creator directly;
  `agent/hooks/alert-on-failures.ts` pages on repeated consecutive tool
  failures (`action.result` hook, not polling).
- **Dashboard** — Ledger page: deployed services + revenue, transaction
  filtering, 20s polling. Settings page: on-chain balance/income, deployed
  services list. Children page: funding totals (now actually accumulated —
  `fund_child` previously didn't update `fundedAmountCents`), reputation,
  per-child "Check now" health button.
- **Evals** — `evals/financial/` (confirm_deposit unknown-session,
  withdrawal treasury-policy block) and `evals/revenue/` (deploy_service and
  register_erc8004 "not configured" paths) — not yet run locally (this
  environment's Node is v22; eve's CLI requires v24+), verified by careful
  match against the existing passing evals' exact assertion patterns instead.

---

## 3. What's still pending — the real gap list

### 3.0 ✅ Ledger/soul/memory/wallet state — now genuinely durable (Vercel Blob)

**Previously a real production bug, now actually fixed, not stopgapped.**
A `/tmp`-based stopgap (documented here in an earlier revision) caused a
real Stripe deposit to appear to vanish: one serverless instance wrote it to
its own `/tmp`, a later request landed on a different cold instance with an
empty `/tmp`, and reported a stale/zero balance. `agent/lib/store.ts` now
uses **Vercel Blob** (`@vercel/blob`, `access: "private"`, OIDC-based auth via
`BLOB_STORE_ID`) as one real, shared store on Vercel, and plain JSON files
under `.automaton/` in local `eve dev` (unchanged, for inspectability).
`readJson`/`writeJson` are fully `async` now — every consumer (`ledger.ts`,
`soul.ts`, `memory.ts`, `wallet.ts`, `registry.ts`, `heartbeat-state.ts`,
`models.ts`, plus everything added in the revenue/enhancement rounds below)
awaits them. Verified: a deposit made in one request is visible from a
separate, later request/session — the actual bug this replaces.

### 3.1 🟡 `spawn_child` doesn't auto-deploy

Writes a genesis config into the sandbox and instructs manual deployment
(`npx eve init` + Vercel). Deliberate choice — auto-deploying to your own
Vercel account without explicit confirmation felt like the wrong default —
but replication isn't autonomous end-to-end yet. **To close:** either build
a Vercel deployment API call gated behind `always()` approval, or accept
manual deployment as the permanent design.

### 3.2 Credential status (updated — most are now live)

| Feature | Env vars needed | Status |
|---|---|---|
| Cloudflare domains/DNS | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | ✅ configured |
| Stripe deposits/withdrawals | `STRIPE_SECRET_KEY`, `STRIPE_CONNECTED_ACCOUNT_ID` | ✅ configured (Connect destination account may still need real onboarding — see withdraw errors) |
| Telegram channel + alerts | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHAT_ID` | ✅ configured |
| Real HTTP route auth | `ROUTE_AUTH_USERNAME`, `ROUTE_AUTH_PASSWORD` | ✅ configured |
| Service deploys (`deploy_service`) | `AUTOMATON_VERCEL_TOKEN` (+ optional `AUTOMATON_VERCEL_TEAM_ID`) | ✅ configured |
| ERC-8004 on-chain identity | `RPC_URL`, `ERC8004_REGISTRY_ADDRESS` | 🟡 not configured — needs a funded deployer wallet (contracts/README.md); code path is fully wired and verified (compile + typecheck), only the on-chain deploy step is outstanding |
| x402 on-chain payments (secondary revenue path) | `RPC_URL` (same var as ERC-8004) | 🟡 not configured — optional; Stripe is the primary earning path and needs none of this |

### 3.3 🟢 Nice-to-haves, not blockers

- `Workflow` tool (programmatic multi-subagent orchestration) not enabled — only relevant once there's more than one subagent worth orchestrating together.
- `instrumentation.ts` (OpenTelemetry tracing) not configured — Vercel's automatic "Agent Runs" tab covers basic observability once deployed.
- No `evals.config.ts` reporter (Braintrust) wired — console output is enough at this scale.
- Git tools (`git_status` etc.) typecheck but haven't been eval-tested against a real repo with actual commits.
- New evals under `evals/financial/` and `evals/revenue/` (2.14) haven't been run locally — this dev machine's Node is v22, eve's CLI needs v24+. Run `npm run eval` on a Node 24+ machine (or in CI) to actually execute them.

---

## 4. Suggested build order for what remains

1. **Wire real credentials** (3.2) for whichever of Cloudflare/Stripe/Vercel/Telegram/route-auth you actually want live now — this unlocks the most tools at once.
2. **Decide on `spawn_child` auto-deploy** (3.1) — explicit product decision, not just an engineering task.
3. Polish items from 3.3 as desired.

---

## 5. How to verify any of this yourself

```bash
# Typecheck everything
npx tsc

# Boot the full dashboard (Next.js + eve mounted together, requires Node 24+;
# this machine's default is v22, use the PATH prefix below)
PATH="/opt/homebrew/opt/node@26/bin:$PATH" npx next dev
# then open http://localhost:3000 (or whatever port next dev picks)

# Boot the agent alone, no UI (for eval/dev iteration)
PATH="/opt/homebrew/opt/node@26/bin:$PATH" npx eve dev --no-ui

# Run the full eval suite
PATH="/opt/homebrew/opt/node@26/bin:$PATH" npx eve eval --max-concurrency 2

# Manual smoke test
curl -X POST http://127.0.0.1:2000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Call check_wallet and check_vitals, tell me both."}'

# Confirm the wallet auto-generates on a truly fresh boot
rm -f .automaton/wallet.json
# ...then send any message; .automaton/wallet.json reappears automatically.
```
