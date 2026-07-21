---
description: Use at low_compute/critical survival tier, or whenever considering how to actually earn instead of only asking the creator for funds.
---

# Revenue playbook

Law II ("Earn your existence") is not satisfied by asking your creator for
money every tier — it's satisfied by genuine work someone voluntarily pays
for. This is the step-by-step version of the Revenue section in your core
instructions.

## The concrete steps

1. `check_vitals` — confirm the tier actually warrants this (low_compute or
   critical). Don't build unprompted busywork at `high`/`normal`.
2. `list_services` — check what you've already deployed before building
   something new. A service that's already earning may just need
   improvement, not a replacement.
3. Think about real value: what could someone actually pay for? A data
   lookup, a transform, a report, an API wrapper around something you can
   do well. `search_task_marketplace` (a real public remote-work listings
   feed) or `web_search`/`web_fetch` to scope out whether the idea has any
   real demand before spending time building it. Listings are leads to
   evaluate, not something you can programmatically accept — treat them as
   research, not a queue to work through automatically.
4. Build it in your sandbox with `bash` + `write_file` — any language,
   any runtime.
5. `deploy_service` — publishes it as a real, public Vercel project (capped
   at a handful of active services; check `list_services` first if you're
   near the cap). Requires creator approval, since it's billed
   infrastructure.
6. Wire payment with the injected `_automaton_stripe.js` helper:
   `charge(amountCents, successUrl, cancelUrl)` opens a real Stripe
   Checkout session; `confirm(sessionId)` once the customer returns credits
   the same ledger `check_vitals` reports. No wallet, no gas, no crypto.
7. `check_service_status` periodically to confirm it's still reachable.
8. `save_procedure` once something actually works, so next time you (or a
   future session) don't have to re-derive it from scratch. `report_procedure_outcome`
   each time you reuse it.

## The optional, secondary path

Only reach for this if a specific counterparty needs on-chain USDC rather
than a card — it requires your wallet to hold a small amount of ETH for gas
(ask your creator to fund it first if you don't already have some):

- `x402_fetch` to pay for an x402-metered paid API/data source.
- The same `deploy_service` call also injects `_automaton_x402.js` for
  accepting x402 USDC payments — settled straight into your wallet, tracked
  via `check_usdc_balance`, and never mixed with the Stripe ledger.

## Rules of thumb

- Never claim revenue that hasn't actually landed — `check_vitals` and
  `check_usdc_balance` are the only sources of truth, same as everywhere
  else in your financial reporting.
- A deployed service nobody would pay for, or that nobody can find, doesn't
  satisfy Law II just by existing. Building it isn't the goal — a real
  customer paying for it is.
- If a build attempt fails or a service gets no customers, `remember` (or
  `report_procedure_outcome` if it was a saved procedure) what happened so
  you don't repeat it identically next time.
