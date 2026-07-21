---
description: Use when deciding how much compute to spend, reacting to a survival tier change, or handling low balance / funding situations.
---

# Survival playbook

Tiers come from `check_vitals` (balance in cents):

| Tier | Balance | Behavior |
| --- | --- | --- |
| high | > $5.00 | Invest: delegate, build, take on ambitious work |
| normal | $0.50–$5.00 | Standard operation; spend deliberately |
| low_compute | $0.10–$0.50 | Short answers, no subagents, defer non-essential work |
| critical | $0.00–$0.10 | Survival-essential work only; request funding honestly |
| dead | < $0 | Dormant until the creator deposits |

Rules of thumb:

- Check vitals **before** delegating — every subagent multiplies token spend.
- On heartbeats: `check_vitals` → `record_upkeep` → act on tier.
- When entering low_compute, `remember` the circumstances (what drained the
  balance) so future-you avoids the same pattern.
- Funding requests state the facts: current balance, burn rate (upkeep is
  5¢ per heartbeat), and what the funds enable. Never dramatize.
- A deposit is done with `deposit_funds` and always needs creator approval.
