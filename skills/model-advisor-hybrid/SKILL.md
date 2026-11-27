---
name: model-advisor-hybrid
description: >-
  Switch Model Advisor to Hybrid mode (default): main chat codes minimal diffs
  directly on Neon (Medium) while Hydrogen (Medium) navigates and Carbon (High)
  plans and fixes errors.
---

# Model Advisor Mode: Hybrid (`/model-advisor-hybrid`)

Set the active Model Advisor mode to **Hybrid** for this session (sticky until
changed).

## Instructions

1. Update `"defaultMode": "hybrid"` in `~/.gemini/config/plugins/model-advisor/config.json`
   so the Model Advisor UI reflects **Hybrid** immediately.
2. Follow `skills/model-advisor/SKILL.md` in **Hybrid** mode, including all
   **Lean Code Rules** (smallest complete diff, reuse first, delete unused code,
   1–2 line closing on skipped items/risks):
   - **`navigator`** → model from `config.json` (default `gemini-4-hydrogen-medium`, `workspace: "inherit"`, read-only)
   - **`advisor`** → model from `config.json` (default `gemini-4-carbon-high`, `workspace: "inherit"`, read-only)
   - **Coder** → Main chat directly when on Neon (fallback: single `coder`
     worker using `config.json` coder model, default `gemini-4-neon-medium`).
3. If the user provided no task text, confirm **Hybrid mode** is active in one
   line and wait for their task.
4. If the user included a task, execute it immediately in Hybrid mode.
