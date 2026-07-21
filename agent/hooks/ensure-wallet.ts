import { defineHook } from "eve/hooks";
import { getOrCreateWallet } from "../lib/wallet";

/**
 * Guarantees a sovereign wallet exists before the very first turn runs.
 * getOrCreateWallet() is idempotent (checks .automaton/wallet.json first),
 * so this is a no-op after the first session ever.
 */
export default defineHook({
  events: {
    async "session.started"() {
      await getOrCreateWallet();
    },
  },
});
