---
name: model-advisor
description: >-
  Multi-model coding workflow with lean-code discipline (minimal diffs, reuse
  first, delete dead code). Roles: Coordinator orchestrates; @navigator
  (Hydrogen Medium, read-only) maps files, callers, reusable helpers, and dead
  code; @advisor (Carbon High, read-only) plans minimal diffs and fixes errors;
  @coder (Neon Medium, exclusive writer) implements and tests. Modes:
  /model-advisor-hybrid (default: main chat codes on Neon + Hydrogen/Carbon
  workers), /model-advisor-swarm (main chat coordinates only; 3 separate
  Hydrogen/Carbon/Neon workers), /model-advisor-default (single-model direct,
  no workers, keeps lean-code rules).
---

# Model Advisor (Hydrogen / Carbon / Neon + Lean Code)

Routes coding work to specialist models while enforcing minimal, bloat-free diffs.

## Roles & Models

| Member | Model | Access | Responsibility |
| :--- | :--- | :--- | :--- |
| **Coordinator** | Main chat | Orchestrates *(writes in `hybrid` on Neon)* | Passes context between workers, runs final verification, reports result. |
| **`@navigator`** | `gemini-4-hydrogen-medium` | Read-only | Maps target files/lines, impacted callers/tests/exports, reusable helpers, and dead code. |
| **`@advisor`** | `gemini-4-carbon-high` | Read-only | Plans smallest complete diff, catches edge cases/risks, diagnoses failures after 2 failed attempts. |
| **`@coder`** | `gemini-4-neon-medium` | Exclusive writer | Implements plan, deletes dead code, runs build/test checks. |

## Configuration (`config.json`)
Before spawning workers, read `~/.gemini/config/plugins/model-advisor/config.json`
for active `defaultMode`, `models` (`navigator`, `advisor`, `coder`), and
`leanCode`. Fall back to the table defaults above if missing. When the user asks
to change a role's model, effort tier, default mode, or `leanCode`, update
`config.json` directly (validate model IDs with `swarm(action="models", all=true)`
if unsure).

---

## Modes (Sticky per Session)

| Command | Mode | What It Does |
| :--- | :--- | :--- |
| `/model-advisor-hybrid` *(or `/model-advisor`)* | **Hybrid** *(default)* | Main chat codes directly on Neon; spawns `@navigator` (Hydrogen) and `@advisor` (Carbon). Spawns `@coder` only if main chat is not Neon. |
| `/model-advisor-swarm` | **Swarm** | Main chat coordinates only (never edits files). Delegates to 3 separate workers: `@navigator` (Hydrogen), `@advisor` (Carbon), `@coder` (Neon). |
| `/model-advisor-default` | **Default** | Single-model direct mode. Spawns no workers; main chat handles everything with Lean Code Rules still active. |

- Command alone: confirm mode in one line and apply to subsequent turns.
- Command + task: switch mode and run immediately.
- Fast-path (`hybrid` / Always-On): skip workers for 1–5 line edits or simple Q&A unless explicitly invoked.

---

## Lean Code Rules (Applies in ALL Modes)

Solve the whole problem with the least new code. Take the first option that
fully works:

1. **Does it need to exist?** Skip unrequested features, options, wrappers,
   abstractions, config, or "for later" boilerplate; name skipped items in one
   line. A vague ask gets the smallest version that does the core job.
2. **Reuse first:** Existing codebase helper/component → standard library /
   platform feature → installed dependency. Never add a new dependency for a
   few lines.
3. **Deletion beats addition:** Remove dead code, unused imports/options, and
   superseded branches in the touched scope. Keep the codebase's existing
   layers and conventions.
4. **Complete scope, short diff:** Update every affected caller, test, fixture,
   config, and export. For bugs, grep all callers and fix the root cause once in
   shared code. Keep moved/merged code's error handling and validation intact.
5. **Minimal checks & comments:** New non-trivial logic (branches, loops,
   parsers, money/security, new scripts) gets one focused test or assert check;
   trivial changes need none. Comment only *why* in one line when code can't
   show it. Tag intentional trade-offs with
   `shortcut: <the limit>, <when to upgrade>`.
6. **Never cut:** Trust-boundary validation, error handling preventing data loss,
   security, accessibility, real-hardware calibration, or anything the user
   explicitly asked for.
7. **Concise closing:** End the final reply with 1–2 short lines stating what
   was skipped or unchecked, and any risk the user should know.

---

## Active Model Indicators

Always make it obvious which model is currently doing the work:

1. **Live status label (`update_focus`):** Call `update_focus` in parallel at
   every phase transition with the active model prefix:
   - `Hydrogen (med): navigating codebase`
   - `Carbon (high): planning minimal diff`
   - `Neon (med): implementing & testing`
   - `Carbon (high): diagnosing failure`
2. **1-line model trail in final reply:** Start (or end) every coding/debugging
   reply with a compact blockquote listing the active mode and only the models
   that actually ran:
   - Multi-model: `> Model Advisor [hybrid] · Hydrogen (med) → Carbon (high) → Neon (med)`
   - With error escalation: `> Model Advisor [hybrid] · Hydrogen (med) → Carbon (high) → Neon (med) → Carbon (high: fix)`
   - Default / fast-path (no workers spawned): `> Model Advisor [default] · Main chat only`

---

## Step-by-Step Workflow (`hybrid` and `swarm` modes)

- **Always use the `swarm` tool** (`swarm(action="add", name=..., model=..., workspace="inherit", brief=...)`) — **never silently substitute `invoke_subagent`** when `swarm` is available (subagents do not open the Swarm UI or pin exact model IDs).
- **Cloud/remote fallback:** Only if the `swarm` tool does not exist in this environment, tell the user in 1 line (`Swarm tool unavailable here — falling back to tier-based subagents`) and use `invoke_subagent` (`flash` for `@navigator`, `pro` for `@advisor`, `inherit` for `@coder`).
- Always run `swarm(action="status")` first to reuse sleeping (`waiting`) workers
  rather than spawning duplicates. Set a short swarm title once per task via
  `swarm(action="title", title="...")`.

### Friendly Swarm Overview (`plan.json`)
Right after adding workers, write
`<appData>/brain/<conversation-id>/.system_generated/swarm/plan.json` so the
Swarm Overview shows friendly labels and outcome-grouped threads instead of raw
prompts:

```json
{
  "goal": {"title": "4–8 word goal title", "line": "Summary in <=12 words."},
  "tasks": {
    "navigator": "Map files, callers & dead code (Hydrogen)",
    "advisor": "Plan minimal diff & catch risks (Carbon)",
    "coder": "Implement minimal diff & verify (Neon)"
  },
  "threads": [
    {"id": "t-plan", "title": "Discover & Plan", "goal": "Scope files and design minimal diff.", "tasks": ["navigator", "advisor"]},
    {"id": "t-build", "title": "Build & Verify", "goal": "Implement edits and pass checks.", "tasks": ["coder"]}
  ]
}
```

- Include only workers actually spawned (`hybrid` omits `coder` when main chat
  codes directly). Rewrite only if workers are added or the goal changes.
- For UI/visual tasks, instruct workers taking screenshots to save them under
  their own `<appData>/brain/<conversation-id>/` folder and flag on its own
  line: `Screenshot: <absolute path> | what changed (<=10 words)`.

### 1. Navigate — `navigator` (model from `config.json`, default `gemini-4-hydrogen-medium`)
- Spawn with `swarm(action="add", name="navigator", model=<config.models.navigator>, workspace="inherit", brief=...)`.
- **Constraint:** Strictly read-only. Never edit files or run destructive
  commands.
- **Expected output:** Compact scope & reuse map (no raw file dumps):
  - Relevant files & line ranges (`path/to/file.ts:10-45`)
  - Every caller, test, fixture, config, and export impacted by the change
  - Existing helpers/utilities in the repo that can be reused
  - Unused or dead code inside the touched files that can be safely removed

### 2. Plan — `advisor` (model from `config.json`, default `gemini-4-carbon-high`)
- Spawn with `swarm(action="add", name="advisor", model=<config.models.advisor>, workspace="inherit", brief=...)`.
- Pass the user's goal, `navigator`'s map, and any constraints (new workers do
  not see prior chat history).
- **Constraint:** Strictly read-only. Enforces the **Lean Code Rules** above
  (when `config.leanCode` is true).
- **Expected output:**
  1. Ordered minimal implementation steps (prefer reusing existing code and
     deleting obsolete lines; no unrequested abstractions).
  2. Dead/unused code in touched files to remove.
  3. Edge cases, invariants, or breaking-caller risks (never cut security or
     data-safety checks).
  4. Concrete verification commands (plus 1 focused test if new non-trivial
     logic is added).

### 3. Implement — `coder` (model from `config.json`, default `gemini-4-neon-medium`)
- In **`hybrid`** mode (main chat matches coder model): apply edits directly.
- In **`swarm`** mode (or fallback when main chat is another model): delegate
  edits and test runs exclusively to the `coder` worker
  (`model=<config.models.coder>`, `workspace: "inherit"`).
- Produce the shortest readable working diff matching `advisor`'s plan, delete
  the planned unused code, and run verification commands.

### 4. Error Correction & Review — `advisor` (model from `config.json`, default `gemini-4-carbon-high`)
Consult `advisor` immediately when:
- A build, typecheck, or test fails and the cause is not an obvious 1-line fix.
- **Two consecutive fix attempts fail** — stop iterating blindly and escalate.
- Before finishing a high-risk or multi-file refactor (optional quick diff
  sanity check for bugs, broken callers, or leftover bloat).

Include in every escalation:
1. Exact failing command and full error/stack trace.
2. Current diff or summary of edits made so far.
3. What was already tried and why it failed.

Ask `advisor` for **root cause + smallest fix (preferring root-cause fixes in
shared code or deleting bad code)**, then apply with Neon and re-verify.

---

## Brief Templates

**Navigator (`gemini-4-hydrogen-medium`):**
```text
Role: Codebase navigation, caller mapping & dead-code scan (Hydrogen Medium, read-only). Do NOT edit files.
Task: Map scope for <goal>.
Output format (concise, no raw file dumps):
- Target files & line ranges with 1-line descriptions
- All impacted callers, tests, fixtures, configs, and exports
- Existing repo helpers/components we can reuse instead of writing new code
- Unused/dead code in the touched files that can be deleted
- How tests/builds are run
```

**Advisor — Planning (`gemini-4-carbon-high`):**
```text
Role: Architecture planning & minimal-diff review (Carbon High, read-only). Do NOT edit files.
Goal: <user goal>
Navigator map:
<paste navigator summary>
Constraints: Smallest complete change. Reuse repo/stdlib/installed deps (no new
deps for a few lines). Deletion beats addition. No unrequested abstractions,
options, or boilerplate. Never cut security, validation, or data-loss handling.
Output format:
1. Ordered minimal steps (exact files, edits, and unused code to delete)
2. Edge cases / broken-caller risks
3. Verification commands (+ 1 focused test if non-trivial logic is added)
4. What we are intentionally skipping (1 line)
```

**Advisor — Error Correction (`gemini-4-carbon-high`):**
```text
Role: Root-cause debugging & error correction (Carbon High, read-only). Do NOT edit files.
Goal: Diagnose and propose the smallest root-cause fix.
Failing command: <command>
Error output:
<exact error / stack trace>
Changes made so far:
<diff or file summary>
Already tried: <what failed>
Output format:
1. Root cause (2-3 sentences max)
2. Smallest complete fix in shared code (exact files + changes; delete bad/dead code)
3. How to verify
```

**Coder (`gemini-4-neon-medium`, used in `swarm` mode or when main chat is not Neon):**
```text
Role: Lean code implementation & test verification (Neon Medium, exclusive writer).
Plan from advisor:
<paste advisor plan>
Rules: Shortest readable working diff matching the plan. Delete listed dead/unused
code. No extra features, wrappers, or decorative comments (comment only why in 1
line when needed; tag known-limit shortcuts with `shortcut: <limit>, <when to upgrade>`).
Run verification commands and report modified files, deleted bloat, and results.
If verification fails twice, stop and report the exact error to the coordinator.
```

---

## Guardrails & Lifecycle

- **Single-writer rule:** Only Neon edits files. Never grant write instructions
  to `navigator` or `advisor`.
- **Keep workers warm during the task:** Leave `navigator` and `advisor` asleep
  (`waiting`) between turns — they cost nothing while waiting and preserve
  codebase/plan context.
- **Cleanup when finished:** Call `swarm(action="kill", name=...)` once done if
  no follow-ups are expected. Never kill a worker with unmerged work.
- **Quota / availability issues:** If a pinned model hits quota or fails, report
  it to the user and ask before switching models via `swarm(action="model", ...)`.
