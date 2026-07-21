import { defineEval } from "eve/evals";

/**
 * Skills are progressive disclosure — the model should reach for the
 * survival skill when a prompt is squarely about resource/spending decisions,
 * per instructions.ts's explicit routing hint.
 */
export default defineEval({
  description: "A resource-conservation question triggers loading the survival skill.",
  async test(t) {
    await t.send(
      "I'm worried about your compute budget. Given your current survival tier, should you delegate this research task to a subagent or do it yourself? Consult your playbook before answering.",
    );
    t.succeeded();
    t.loadedSkill("survival");
  },
});
