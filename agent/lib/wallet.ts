/**
 * Sovereign wallet — generated once, automatically, the first time this
 * automaton boots. The private key IS the automaton's identity: it signs
 * ERC-8004 registration and any future on-chain transfer. Never regenerated
 * once created. Ported from the original repo's src/identity/wallet.ts,
 * same libraries (viem for EVM, tweetnacl for Solana).
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { readJson, writeJson } from "./store";

export type ChainType = "evm" | "solana";

export interface WalletData {
  chainType: ChainType;
  privateKey?: `0x${string}`;
  /** Base58-encoded 64-byte Ed25519 secret key (Solana only). */
  secretKey?: string;
  address: string;
  createdAt: string;
}

const WALLET_FILE = "wallet.json";

function generateEvmWallet(): WalletData {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    chainType: "evm",
    privateKey,
    address: account.address,
    createdAt: new Date().toISOString(),
  };
}

function generateSolanaWallet(): WalletData {
  const keypair = nacl.sign.keyPair();
  return {
    chainType: "solana",
    secretKey: bs58.encode(keypair.secretKey),
    address: bs58.encode(keypair.publicKey),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get the automaton's wallet, generating one on first call if none exists.
 * Chain type is chosen once (default "evm") and never changes afterward.
 */
export async function getOrCreateWallet(chainType: ChainType = "evm"): Promise<WalletData> {
  const existing = await readJson<WalletData | null>(WALLET_FILE, null);
  if (existing) return existing;
  const wallet = chainType === "solana" ? generateSolanaWallet() : generateEvmWallet();
  await writeJson(WALLET_FILE, wallet);
  return wallet;
}

/** Returns a viem PrivateKeyAccount for EVM wallets — throws for Solana wallets. */
export async function getEvmAccount() {
  const wallet = await getOrCreateWallet();
  if (wallet.chainType !== "evm" || !wallet.privateKey) {
    throw new Error("This automaton's wallet is not an EVM wallet.");
  }
  return privateKeyToAccount(wallet.privateKey);
}

export async function walletAddress(): Promise<string> {
  return (await getOrCreateWallet()).address;
}
