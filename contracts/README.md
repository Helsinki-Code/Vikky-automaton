# Deploying the ERC-8004 identity registry

This is the on-chain contract `register_erc8004` and `agent/lib/erc8004.ts`
talk to. It's minimal by design — one function, no admin, no upgradability.
You deploy it once; the automaton then registers itself against it using its
own auto-generated wallet.

## What you need before starting

1. **A small amount of real ETH on Base** (mainnet) or free testnet ETH on
   **Base Sepolia** (recommended first) — enough to pay gas for one contract
   deployment (a few cents on Base, free on Sepolia).
2. **An RPC endpoint** for the chain you're deploying to. Free public
   options:
   - Base Sepolia (testnet): `https://sepolia.base.org`
   - Base mainnet: `https://mainnet.base.org`, or get a private one from
     [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/)
     (free tier is plenty).
3. **A funded wallet you control** to pay for deployment gas — **not** the
   automaton's own wallet. Deployment is a one-time human setup action; the
   automaton's wallet only needs to exist by the time it *registers* (which
   costs it a small amount of gas too — fund the automaton's address, shown
   by the `check_wallet` tool, with a little ETH before it calls
   `register_erc8004`).

If you don't have a wallet handy for deployment, generate a throwaway one:

```bash
node -e "console.log(require('viem/accounts').generatePrivateKey())"
```

That prints a private key — fund its address (derive it, or just run the
deploy script once with `DEPLOY_DRY_RUN` logging, see below) with testnet ETH
from a faucet like [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia),
then use it only for this one deployment.

## Step 1 — Compile

```bash
npm run erc8004:compile
```

Writes `contracts/ERC8004Registry.json` (ABI + bytecode). Already done once
in this repo — re-run only if you edit `ERC8004Registry.sol`.

## Step 2 — Deploy

```bash
RPC_URL=https://sepolia.base.org \
DEPLOYER_PRIVATE_KEY=0xyour_deployer_key \
npm run erc8004:deploy
```

This prints the deployed contract address, e.g.:

```
Deployed successfully.
Contract address: 0xAbCd...1234

Add these to .env.local:
  RPC_URL=https://sepolia.base.org
  ERC8004_REGISTRY_ADDRESS=0xAbCd...1234
```

The script auto-detects testnet vs mainnet from whether `RPC_URL` contains
`"sepolia"` — same convention `agent/lib/erc8004.ts` uses at registration
time, so both sides always agree on which chain they're talking to.

**Never commit `DEPLOYER_PRIVATE_KEY` anywhere.** It's a one-shot env var for
this script only — the deployed contract has no owner/admin key to keep
afterward.

## Step 3 — Configure the automaton

Add the two lines the script printed to `.env.local`:

```
RPC_URL=https://sepolia.base.org
ERC8004_REGISTRY_ADDRESS=0xAbCd...1234
```

Restart the agent (`npm run dev`) so it picks up the new env vars.

## Step 4 — Fund the automaton's wallet

The automaton signs its own registration transaction with its own
auto-generated wallet (`agent/lib/wallet.ts`), so *that* address needs a
little gas too — separate from the deployer wallet above.

```bash
# Ask the agent for its address, or via the dashboard's
# "Show wallet address" quick action
curl -s -X POST http://localhost:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Call check_wallet."}'
```

Send a small amount of testnet ETH (or real ETH on mainnet) to the address
it returns.

## Step 5 — Register

Ask the automaton to register (via the dashboard chat, or the API directly):

```
Call register_erc8004 with agentURI "https://your-domain.example/agent-card.json".
```

This is `always()`-approval-gated, so you'll get a confirmation prompt first
(in the dashboard, a real approve/deny card) before the transaction actually
sends. Once confirmed, `system_synopsis` will show the registry entry —
`agentId`, `contractAddress`, `txHash` — permanently (registration can only
happen once per wallet address; the contract reverts on a second attempt).

## What `agentURI` should point to

Any publicly reachable JSON describing the agent — name, description,
capabilities. There's no on-chain validation of its contents beyond
non-empty; the contract just records the string. `update_agent_card` builds
the JSON shape locally; hosting it publicly (e.g. a static route on your
eventual dashboard deployment) is a separate step not yet automated.

## Verifying the contract on a block explorer (optional)

Not required for anything to work, but nice for transparency. On
[Basescan](https://basescan.org) (or [Sepolia Basescan](https://sepolia.basescan.org)),
use "Verify and Publish" with:
- Compiler: matches the `pragma solidity ^0.8.24` in the source
- Optimization: enabled, 200 runs (matches `scripts/compile-erc8004.mjs`'s settings)
- Source: `contracts/ERC8004Registry.sol` as-is, no constructor arguments
