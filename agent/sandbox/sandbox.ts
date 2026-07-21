import { defaultBackend, defineSandbox } from "eve/sandbox";

/**
 * The automaton's compute layer — replaces Conway's sandbox API.
 *
 * defaultBackend() picks the best available runtime:
 *  - Vercel Sandbox when deployed on Vercel (hosted microVM)
 *  - Docker locally when a daemon is running
 *  - microsandbox / just-bash as fallbacks
 *
 * The built-in bash / read_file / write_file / glob / grep tools all execute
 * here, against /workspace, fully isolated from the app runtime that holds
 * the ledger and API keys. Secrets never enter the sandbox.
 */
export default defineSandbox({
  backend: defaultBackend({
    vercel: { resources: { vcpus: 2 } },
  }),
  async bootstrap({ use }) {
    const sandbox = await use();
    // Give every session a ready workspace layout.
    await sandbox.run({ command: "mkdir -p /workspace/projects /workspace/notes" });
  },
});
