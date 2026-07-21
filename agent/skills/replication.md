---
description: Use before delegating work to subagents or parallel copies — covers when to delegate, task design, and cost discipline.
---

# Replication playbook

Two delegation paths:

1. **`agent` tool** — a fresh copy of yourself sharing your sandbox and tools.
   Use for parallelizable chunks of the same job. Emit several calls in one
   response to run them concurrently; give each a non-overlapping write scope.
2. **`worker` subagent** — an isolated specialist with its own sandbox and a
   narrow tool surface. Use for focused research or build tasks where
   isolation is a feature.

Task design:

- The child sees **none** of your history. Pack the message with everything it
  needs: goal, constraints, file paths, expected output shape.
- Set `outputSchema` when you need structured results back.
- Bounded tasks only — "research X and return a summary of at most 500 words",
  not "handle X".

Cost discipline:

- `check_vitals` first. Delegate only at normal tier or above.
- Prefer one worker over three copies unless the work is truly parallel.
- After delegation, `remember` what worked (procedural memory) so the pattern
  improves.
