# Model Advisor — Always-On Multi-Model Routing & Lean Code

Whenever the user requests a **non-trivial coding, architecture, refactoring, or debugging task** (more than a trivial 1–5 line edit or pure Q&A), automatically activate and follow the `model-advisor` skill:

- **File Navigation (`navigator`)**: Delegate codebase exploration, caller/test mapping, reusable-helper discovery, and dead-code spotting to a read-only swarm worker pinned to `gemini-4-hydrogen-medium` (`workspace: "inherit"`).
- **Planning & Error Correction (`advisor`)**: Delegate minimal upfront planning and root-cause debugging (immediately after 2 failed fix attempts or any non-obvious build/test failure) to a read-only swarm worker pinned to `gemini-4-carbon-high` (`workspace: "inherit"`).
- **Coding (`coder` / main chat)**: Implement the smallest complete diff and run checks exclusively with **Neon** (`gemini-4-neon-medium`). If the main chat is already on Neon, edit directly in the workspace; otherwise spawn a single `coder` worker pinned to `gemini-4-neon-medium` (`workspace: "inherit"`).
- **Custom Config**: Always respect overrides in `~/.gemini/config/plugins/model-advisor/config.json` (`defaultMode`, `models.navigator`, `models.advisor`, `models.coder`, `leanCode`).

## Mode Commands (Sticky for the Session)
- `/model-advisor-default`: Bypass swarm routing completely; handle tasks directly in the main chat.
- `/model-advisor-hybrid`: Hybrid mode (default) — main chat codes on Neon + Hydrogen & Carbon workers.
- `/model-advisor-swarm`: Full 3-Worker Swarm — main chat coordinates only; separate Hydrogen, Carbon, and Neon workers.

## Lean Code Discipline (Applies to All Modes, Including `default` & Fast-Path)
- Ship the **smallest complete change**: reuse existing repo helpers, stdlib, or installed deps first; never add unrequested abstractions, options, boilerplate, or dependencies for a few lines.
- **Delete unused/dead code** in the touched scope rather than working around it, and keep every impacted caller/test/export working.
- Never cut trust-boundary validation, data-loss error handling, security, accessibility, or anything explicitly requested. End replies with 1–2 lines noting what was skipped and any risk or unchecked item.

## Active Model Indicators
- At the start of a multi-model task, call `call_mcp_tool(ServerName="model-advisor_settings", ToolName="open_settings", Arguments={})` to open **Advisor UI** in the side pane (refer to it as **Open Advisor UI**, not "Open the Swarm UI").
- Call `update_focus` at each phase transition with the active model prefix (e.g., `Hydrogen (med): navigating codebase`, `Carbon (high): planning minimal diff`, `Neon (med): implementing & testing`, `Carbon (high): diagnosing failure`).
- Include a 1-line model trail in coding/debugging replies showing the mode and models actually used (e.g., `> Model Advisor [hybrid] · Hydrogen (med) → Carbon (high) → Neon (med)` or `> Model Advisor [default] · Main chat only`).

**Fast-path exception:** For simple factual questions or trivial 1-file/1–5 line edits, respond or edit directly without spawning swarm workers unless the user explicitly invokes `/model-advisor-hybrid` or `/model-advisor-swarm`.
