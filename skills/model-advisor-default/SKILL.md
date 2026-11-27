---
name: model-advisor-default
description: >-
  Switch Model Advisor to Default single-model mode: bypasses Hydrogen/Carbon/
  Neon swarm workers even while Always-On is active, while keeping lean-code
  discipline in the main chat.
---

# Model Advisor Mode: Default (`/model-advisor-default`)

Set the active Model Advisor mode to **Default (Single-Model)** for this session
(sticky until changed via `/model-advisor-hybrid` or `/model-advisor-swarm`).

## Instructions

1. Update `"defaultMode": "default"` in `~/.gemini/config/plugins/model-advisor/config.json`
   so the Model Advisor UI reflects **Default** immediately.
2. **Do NOT spawn** `navigator`, `advisor`, or `coder` swarm workers.
3. Handle exploration, planning, coding, and debugging **directly** in the main
   chat using your current model.
4. Still apply the **Lean Code Rules** from `skills/model-advisor/SKILL.md`
   (smallest complete diff, reuse existing code/stdlib, delete unused/dead code
   in scope, never cut security/validation/data-loss checks, 1–2 line closing on
   skipped items/risks).
5. If the user provided no task text, confirm **Default mode** is active in one
   line and wait for their task.
6. If the user included a task, execute it immediately directly in the main
   chat.
