import { openai } from "@ai-sdk/openai";
import { defineAgent } from "eve";

export default defineAgent({
  description:
    "A focused specialist for bounded research or build tasks. Runs in its own isolated sandbox with no ledger or memory tools. Give it a complete, self-contained brief and an output shape.",
  model: openai("gpt-5.2"),
  reasoning: "low",
});
