---
name: model-advisor-swarm
description: >-
  Switch Model Advisor to Full 3-Worker Swarm mode: main chat coordinates only
  and delegates to separate pinned Hydrogen (Medium), Carbon (High), and Neon
  (Medium) workers with lean-code discipline.
---

# Model Advisor Mode: 3-Worker Swarm (`/model-advisor-swarm`)

Set the active Model Advisor mode to **Full 3-Worker Swarm** for this session
(sticky until changed).

## Instructions

1. Update `"defaultMode": "swarm"` in `~/.gemini/config/plugins/model-advisor/config.json`
   so the Model Advisor UI reflects **Swarm** immediately.
2. Act **only as coordinator** in the main chat — do NOT edit project files
   directly from the main chat.
3. Follow `skills/model-advisor/SKILL.md` in **Swarm** mode, enforcing all
   **Lean Code Rules** (smallest complete diff, reuse first, delete unused code,
   1–2 line closing on skipped items/risks) across all three workers spawned via
   **`swarm(action="add", name=..., model=..., workspace="inherit", brief=...)`**
   using models from `config.json`:
   - **`navigator`** → default `gemini-4-hydrogen-medium` (read-only)
   - **`advisor`** → default `gemini-4-carbon-high` (read-only)
   - **`coder`** → default `gemini-4-neon-medium` (exclusive writer)
4. **Do NOT silently substitute `invoke_subagent`** when `swarm` is available.
   Only if `swarm` is unavailable in this environment (e.g., cloud/remote),
   state that in 1 line before falling back to tier-based subagents (`flash` /
   `pro` / `inherit`).
5. Check `swarm(action="status")` first to reuse sleeping workers and set a
   swarm title with `swarm(action="title", title="...")`.
6. If the user provided no task text, confirm **Swarm mode** is active in one
   line and wait for their task.
7. If the user included a task, execute it immediately in Swarm mode.
