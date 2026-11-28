import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, "..");
const dataDirArg = process.argv.find((a) => a.startsWith("--data-dir="));
const DATA_DIR = dataDirArg ? dataDirArg.slice("--data-dir=".length) : PLUGIN_ROOT;
const CONFIG_PATH = path.join(PLUGIN_ROOT, "config.json");
const ACTIVITY_PATH = path.join(DATA_DIR, "activity.json");
const APP_HTML_PATH = path.join(__dirname, "app.html");
const APP_URI = "ui://model-advisor/settings.html";

const DEFAULTS = {
  defaultMode: "hybrid",
  models: {
    navigator: "gemini-4-hydrogen-medium",
    advisor: "gemini-4-carbon-high",
    coder: "gemini-4-neon-medium",
  },
  leanCode: true,
};

const VALID_MODES = new Set(["hybrid", "swarm", "default"]);

const MODEL_CATALOG = [
  { group: "Gemini 4 Hydrogen", id: "gemini-4-hydrogen-low", label: "Gemini 4 Hydrogen (Low)" },
  { group: "Gemini 4 Hydrogen", id: "gemini-4-hydrogen-medium", label: "Gemini 4 Hydrogen (Medium)" },
  { group: "Gemini 4 Hydrogen", id: "gemini-4-hydrogen-high", label: "Gemini 4 Hydrogen (High)" },
  { group: "Gemini 4 Hydrogen", id: "gemini-4-hydrogen-xhigh", label: "Gemini 4 Hydrogen (XHigh)" },
  { group: "Gemini 4 Carbon", id: "gemini-4-carbon-low", label: "Gemini 4 Carbon (Low)" },
  { group: "Gemini 4 Carbon", id: "gemini-4-carbon-medium", label: "Gemini 4 Carbon (Medium)" },
  { group: "Gemini 4 Carbon", id: "gemini-4-carbon-high", label: "Gemini 4 Carbon (High)" },
  { group: "Gemini 4 Neon", id: "gemini-4-neon-low", label: "Gemini 4 Neon (Low)" },
  { group: "Gemini 4 Neon", id: "gemini-4-neon-medium", label: "Gemini 4 Neon (Medium)" },
  { group: "Gemini 4 Neon", id: "gemini-4-neon-high", label: "Gemini 4 Neon (High)" },
  { group: "Gemini 4 Neon", id: "gemini-4-neon-xhigh", label: "Gemini 4 Neon (XHigh)" },
  { group: "Gemini 4 Argon", id: "gemini-4-argon-low", label: "Gemini 4 Argon (Low)" },
  { group: "Gemini 4 Argon", id: "gemini-4-argon-medium", label: "Gemini 4 Argon (Medium)" },
  { group: "Gemini 4 Argon", id: "gemini-4-argon-high", label: "Gemini 4 Argon (High)" },
  { group: "Claude 5.5", id: "claude-opus-5-5-medium", label: "Claude Opus 5.5 (Medium)" },
  { group: "Claude 5.5", id: "claude-opus-5-5-high", label: "Claude Opus 5.5 (High)" },
  { group: "Claude 5.5", id: "claude-sonnet-5-5-medium", label: "Claude Sonnet 5.5 (Medium)" },
  { group: "Claude 5.5", id: "claude-sonnet-5-5-high", label: "Claude Sonnet 5.5 (High)" },
  { group: "Other", id: "gemini-3.8-flash-medium", label: "Gemini 3.8 Flash (Medium)" },
  { group: "Other", id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" },
];

function readConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return {
      defaultMode: VALID_MODES.has(raw?.defaultMode) ? raw.defaultMode : DEFAULTS.defaultMode,
      models: {
        navigator: validModelId(raw?.models?.navigator) || DEFAULTS.models.navigator,
        advisor: validModelId(raw?.models?.advisor) || DEFAULTS.models.advisor,
        coder: validModelId(raw?.models?.coder) || DEFAULTS.models.coder,
      },
      leanCode: typeof raw?.leanCode === "boolean" ? raw.leanCode : DEFAULTS.leanCode,
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function validModelId(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[a-z0-9][a-z0-9._-]{1,80}$/i.test(trimmed) ? trimmed : "";
}

function saveConfig(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Config payload must be an object.");
  }
  if (!VALID_MODES.has(input.defaultMode)) {
    throw new Error("defaultMode must be one of: hybrid, swarm, default.");
  }
  const nav = validModelId(input.models?.navigator);
  const adv = validModelId(input.models?.advisor);
  const cod = validModelId(input.models?.coder);
  if (!nav || !adv || !cod) {
    throw new Error("Each role model ID must be a valid non-empty identifier (letters, digits, '.', '_', '-').");
  }
  if (typeof input.leanCode !== "boolean") {
    throw new Error("leanCode must be a boolean.");
  }
  const next = {
    defaultMode: input.defaultMode,
    models: { navigator: nav, advisor: adv, coder: cod },
    leanCode: input.leanCode,
  };
  const tmpPath = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  fs.renameSync(tmpPath, CONFIG_PATH);
  return next;
}

function readActivity() {
  const fallback = {
    activeMember: null,
    activeEdge: null,
    updatedAt: null,
    members: {
      coordinator: { state: "idle", action: "Ready for next task", updatedAt: null },
      navigator: { state: "idle", action: "Waiting to scout files", updatedAt: null },
      advisor: { state: "idle", action: "Waiting to plan or debug", updatedAt: null },
      coder: { state: "idle", action: "Waiting to implement edits", updatedAt: null },
    },
    recentEvents: [],
  };
  try {
    const raw = JSON.parse(fs.readFileSync(ACTIVITY_PATH, "utf8"));
    if (raw && typeof raw === "object" && raw.members) return raw;
  } catch {
    // Missing activity.json before first hook run.
  }
  return fallback;
}

function buildStatePayload(extra = {}) {
  const config = readConfig();
  return {
    ...extra,
    config,
    activity: readActivity(),
    defaults: DEFAULTS,
    catalog: MODEL_CATALOG,
    configPath: CONFIG_PATH,
  };
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function handleRequest(req) {
  const { id, method, params } = req;
  // Notifications have no id and expect no reply.
  if (id === undefined || id === null) return;

  try {
    if (method === "initialize") {
      return sendResult(id, {
        protocolVersion: params?.protocolVersion || "2025-03-26",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "model-advisor", version: "1.2.0" },
      });
    }

    if (method === "ping") {
      return sendResult(id, {});
    }

    if (method === "resources/list") {
      return sendResult(id, {
        resources: [
          {
            uri: APP_URI,
            name: "Model Advisor",
            description: "Live Model Advisor graph, team overview, and model customization.",
            mimeType: "text/html;profile=mcp-app",
            _meta: {
              ui: {
                prefersBorder: false,
                csp: {
                  resourceDomains: [
                    "https://fonts.googleapis.com",
                    "https://fonts.gstatic.com",
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (method === "resources/read") {
      if (params?.uri !== APP_URI) {
        return sendError(id, -32602, `Unknown resource URI: ${params?.uri}`);
      }
      const html = fs.readFileSync(APP_HTML_PATH, "utf8");
      return sendResult(id, {
        contents: [
          {
            uri: APP_URI,
            mimeType: "text/html;profile=mcp-app",
            text: html,
            _meta: {
              ui: {
                prefersBorder: false,
                csp: {
                  resourceDomains: [
                    "https://fonts.googleapis.com",
                    "https://fonts.gstatic.com",
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (method === "tools/list") {
      return sendResult(id, {
        tools: [
          {
            name: "open_settings",
            title: "Open Advisor UI",
            description: "Open the Advisor UI in the side pane (Overview, live Graph, and Customize).",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
            _meta: {
              ui: { resourceUri: APP_URI },
              "com.google.antigravity/ui": {
                entrypoints: [
                  { type: "aux_pane", title: "Model Advisor" },
                  { type: "global", title: "Model Advisor" },
                ],
              },
            },
          },
          {
            name: "app_get_config",
            title: "Get Model Advisor Config",
            description: "Read Model Advisor config.json and model catalog.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
            _meta: { ui: { visibility: ["app"] } },
          },
          {
            name: "app_save_config",
            title: "Save Model Advisor Config",
            description: "Validate and persist Model Advisor config.json.",
            inputSchema: {
              type: "object",
              properties: {
                defaultMode: { type: "string", enum: ["hybrid", "swarm", "default"] },
                models: {
                  type: "object",
                  properties: {
                    navigator: { type: "string" },
                    advisor: { type: "string" },
                    coder: { type: "string" },
                  },
                  required: ["navigator", "advisor", "coder"],
                },
                leanCode: { type: "boolean" },
              },
              required: ["defaultMode", "models", "leanCode"],
            },
            _meta: { ui: { visibility: ["app"] } },
          },
        ],
      });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === "open_settings" || toolName === "app_get_config") {
        const payload = buildStatePayload();
        const c = payload.config;
        return sendResult(id, {
          content: [
            {
              type: "text",
              text: `Model Advisor [${c.defaultMode}] · navigator=${c.models.navigator}, advisor=${c.models.advisor}, coder=${c.models.coder}, leanCode=${c.leanCode}`,
            },
          ],
          structuredContent: payload,
        });
      }

      if (toolName === "app_save_config") {
        const saved = saveConfig(args);
        return sendResult(id, {
          content: [{ type: "text", text: "Saved Model Advisor config.json." }],
          structuredContent: buildStatePayload({ saved: true, config: saved }),
        });
      }

      return sendResult(id, {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      });
    }

    return sendError(id, -32601, `Method not found: ${method}`);
  } catch (err) {
    if (method === "tools/call") {
      return sendResult(id, {
        isError: true,
        content: [{ type: "text", text: err?.message || String(err) }],
      });
    }
    return sendError(id, -32603, err?.message || String(err));
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    handleRequest(JSON.parse(trimmed));
  } catch (err) {
    process.stderr.write(`Invalid JSON-RPC input: ${err?.message || err}\n`);
  }
});
