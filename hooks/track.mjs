import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.PLUGIN_DATA || PLUGIN_ROOT;
const ACTIVITY_PATH = path.join(DATA_DIR, "activity.json");

const DEFAULT_ACTIVITY = () => ({
  activeMember: "coordinator",
  activeEdge: null,
  updatedAt: new Date().toISOString(),
  members: {
    coordinator: { state: "idle", action: "Ready for next task", updatedAt: null },
    navigator: { state: "idle", action: "Waiting to scout files", updatedAt: null },
    advisor: { state: "idle", action: "Waiting to plan or debug", updatedAt: null },
    coder: { state: "idle", action: "Waiting to implement edits", updatedAt: null },
  },
  recentEvents: [],
});

function readActivity() {
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIVITY_PATH, "utf8"));
    if (raw && typeof raw === "object" && raw.members) return raw;
  } catch {
    // Fall back to defaults on missing/corrupt file.
  }
  return DEFAULT_ACTIVITY();
}

function writeActivity(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${ACTIVITY_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, ACTIVITY_PATH);
}

function shortLine(text, fallback) {
  if (typeof text !== "string" || !text.trim()) return fallback;
  const first = text.trim().split(/\r?\n/)[0].replace(/^Role:\s*/i, "").trim();
  return first.length > 72 ? first.slice(0, 69) + "..." : first;
}

function pushEvent(state, member, action, ts) {
  state.recentEvents = [
    { member, action, at: ts },
    ...(Array.isArray(state.recentEvents) ? state.recentEvents : []),
  ].slice(0, 8);
}

async function main() {
  const eventArg = process.argv[2] || "";
  let input = {};
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    if (raw) input = JSON.parse(raw);
  } catch {
    // Ignore malformed stdin.
  }

  const ts = new Date().toISOString();
  const state = readActivity();
  const eventName = input.hookEventName || eventArg;

  if (eventName === "SessionStart") {
    const fresh = DEFAULT_ACTIVITY();
    fresh.members.coordinator = { state: "idle", action: "Session ready", updatedAt: ts };
    writeActivity(fresh);
    process.stdout.write("{}\n");
    return;
  }

  if (eventName === "Stop") {
    for (const key of Object.keys(state.members)) {
      if (state.members[key].state === "working") {
        state.members[key].state = "waiting";
      }
    }
    state.activeMember = null;
    state.activeEdge = null;
    state.updatedAt = ts;
    writeActivity(state);
    process.stdout.write("{}\n");
    return;
  }

  if (eventName === "PostToolUse") {
    const toolName = input.toolCall?.name || "";
    const args = input.toolCall?.args || {};
    const hasError = Boolean(input.error);

    if (toolName === "swarm") {
      const action = args.action;
      const name = typeof args.name === "string" ? args.name.toLowerCase() : "";
      const member = ["navigator", "advisor", "coder"].includes(name) ? name : "coordinator";

      if (action === "add") {
        const label =
          member === "navigator"
            ? shortLine(args.brief, "Scouting files, callers & dead code")
            : member === "advisor"
              ? shortLine(args.brief, "Planning minimal diff / diagnosing error")
              : shortLine(args.brief, "Implementing minimal diff & testing");
        state.members[member] = { state: "working", action: label, updatedAt: ts };
        state.members.coordinator = {
          state: "working",
          action: `Delegated to @${member}`,
          updatedAt: ts,
        };
        state.activeMember = member;
        state.activeEdge = `coordinator->${member}`;
        pushEvent(state, member, label, ts);
      } else if (action === "kill" && state.members[member]) {
        state.members[member] = { state: "idle", action: "Completed & cleaned up", updatedAt: ts };
        if (state.activeMember === member) {
          state.activeMember = "coordinator";
          state.activeEdge = null;
        }
        pushEvent(state, member, "Cleaned up worker", ts);
      }
    } else if (toolName === "edit_file" || toolName === "write_file") {
      const filePath = typeof args.Path === "string" ? path.basename(args.Path) : "file";
      const label = toolName === "write_file" ? `Writing ${filePath}` : `Editing ${filePath}`;
      state.members.coder = { state: "working", action: label, updatedAt: ts };
      state.activeMember = "coder";
      state.activeEdge = "coordinator->coder";
      pushEvent(state, "coder", label, ts);
    } else if (toolName === "run_command") {
      const summary = shortLine(args.toolSummary || args.CommandLine, "Running command");
      const label = hasError ? `Failed: ${summary}` : `Ran: ${summary}`;
      state.members.coder = {
        state: hasError ? "error" : "working",
        action: label,
        updatedAt: ts,
      };
      state.activeMember = "coder";
      state.activeEdge = hasError ? "coder->advisor" : "coordinator->coder";
      pushEvent(state, "coder", label, ts);
    }

    state.updatedAt = ts;
    writeActivity(state);
  }

  process.stdout.write("{}\n");
}

main().catch(() => {
  process.stdout.write("{}\n");
});
