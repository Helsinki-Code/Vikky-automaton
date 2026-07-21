#!/usr/bin/env node
/**
 * Compiles contracts/ERC8004Registry.sol in-process with solc (no Foundry/
 * Hardhat needed) and writes the ABI + bytecode to contracts/ERC8004Registry.json.
 * Run once after editing the contract, before deploying.
 *
 *   node scripts/compile-erc8004.mjs
 */
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const CONTRACT_PATH = path.join(process.cwd(), "contracts", "ERC8004Registry.sol");
const OUTPUT_PATH = path.join(process.cwd(), "contracts", "ERC8004Registry.json");

const source = fs.readFileSync(CONTRACT_PATH, "utf-8");

const input = {
  language: "Solidity",
  sources: {
    "ERC8004Registry.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

const errors = (output.errors || []).filter((e) => e.severity === "error");
if (errors.length > 0) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}
for (const w of (output.errors || []).filter((e) => e.severity === "warning")) {
  console.warn(w.formattedMessage);
}

const contract = output.contracts["ERC8004Registry.sol"]["ERC8004Registry"];
const artifact = {
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(artifact, null, 2));
console.log(`Compiled -> ${OUTPUT_PATH}`);
console.log(`Bytecode size: ${(artifact.bytecode.length - 2) / 2} bytes`);
