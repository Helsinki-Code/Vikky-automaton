/**
 * The receiving side of x402: lets a service the automaton deploys (via
 * deploy_service) actually collect a payment instead of only ever paying
 * others (agent/lib/x402.ts / x402_fetch). The original Conway automaton
 * never had this — it's the "even more features" half of the ask, not a
 * parity gap.
 *
 * No third-party facilitator: the automaton settles payments itself by
 * broadcasting the payer's signed EIP-3009 TransferWithAuthorization on
 * Base, paying its own ETH gas, moving USDC straight into its own wallet.
 * The deployed service never holds the private key — it calls back to
 * /api/x402/settle (this app runtime, where the key actually lives) with
 * the payment header it received.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseSignature,
  type Address,
  type PrivateKeyAccount,
} from "viem";
import { base, baseSepolia } from "viem/chains";

const USDC_ADDRESSES: Record<string, Address> = {
  "eip155:8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "eip155:84532": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

const CHAINS: Record<string, typeof base | typeof baseSepolia> = {
  "eip155:8453": base,
  "eip155:84532": baseSepolia,
};

const TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "transferWithAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface X402Payment {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: `0x${string}`;
    authorization: {
      from: `0x${string}`;
      to: `0x${string}`;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: `0x${string}`;
    };
  };
}

export interface SettleResult {
  settled: boolean;
  reason?: string;
  txHash?: string;
  amountUsdc?: number;
}

/** Builds the 402 response body a deployed service should send when a request arrives unpaid. */
export function buildPaymentRequiredBody(
  payToAddress: string,
  amountUsdc: number,
  network: "eip155:8453" | "eip155:84532" = "eip155:8453",
  deadlineSeconds = 300,
) {
  const maxAmountRequired = Math.round(amountUsdc * 1_000_000).toString(); // 6 decimals, atomic units
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network,
        maxAmountRequired,
        payToAddress,
        usdcAddress: USDC_ADDRESSES[network],
        requiredDeadlineSeconds: deadlineSeconds,
      },
    ],
  };
}

/**
 * Verifies the authorization is addressed to `expectedPayTo` for at least
 * `minAmountAtomic`, then broadcasts transferWithAuthorization on-chain using
 * the automaton's own wallet as the transaction sender (its ETH pays gas;
 * the USDC moves from the signer's `from` address to `to`, which must be the
 * automaton's own address — this can never settle a payment to anyone else).
 */
export async function verifyAndSettlePayment(
  paymentHeaderB64: string,
  account: PrivateKeyAccount,
  expectedPayTo: string,
  minAmountAtomic: bigint,
): Promise<SettleResult> {
  let payment: X402Payment;
  try {
    payment = JSON.parse(Buffer.from(paymentHeaderB64, "base64").toString("utf-8"));
  } catch {
    return { settled: false, reason: "Could not decode X-Payment header." };
  }

  const chain = CHAINS[payment.network];
  const usdcAddress = USDC_ADDRESSES[payment.network];
  if (!chain || !usdcAddress) {
    return { settled: false, reason: `Unsupported network: ${payment.network}` };
  }

  const { authorization, signature } = payment.payload;
  if (authorization.to.toLowerCase() !== expectedPayTo.toLowerCase()) {
    return { settled: false, reason: "Payment is not addressed to this automaton's wallet." };
  }

  const value = BigInt(authorization.value);
  if (value < minAmountAtomic) {
    return { settled: false, reason: `Payment of ${value} is below the required ${minAmountAtomic}.` };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < Number(authorization.validAfter) || now > Number(authorization.validBefore)) {
    return { settled: false, reason: "Authorization is outside its valid time window." };
  }

  const { v, r, s } = parseSignature(signature);

  try {
    const transport = http(process.env.RPC_URL);
    const walletClient = createWalletClient({ account, chain, transport });
    const publicClient = createPublicClient({ chain, transport });

    const txHash = await walletClient.writeContract({
      address: usdcAddress,
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: "transferWithAuthorization",
      args: [
        authorization.from,
        authorization.to as Address,
        value,
        BigInt(authorization.validAfter),
        BigInt(authorization.validBefore),
        authorization.nonce,
        Number(v),
        r,
        s,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { settled: true, txHash, amountUsdc: Number(value) / 1_000_000 };
  } catch (err) {
    return { settled: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
