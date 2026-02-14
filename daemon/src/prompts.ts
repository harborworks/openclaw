/**
 * Prompt Sync — renders Handlebars templates and writes workspace files.
 *
 * On each tick:
 * 1. Fetches templates + harbor sections from Convex
 * 2. For each agent, renders templates with agent + harbor data
 * 3. Writes changed files to the agent's workspace
 */

import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";
import type { ConvexApiConfig } from "./secrets.js";
import type { ConvexAgent } from "./agents.js";

function log(msg: string) {
  console.log(`[prompts] ${new Date().toISOString()} ${msg}`);
}

// --- Types ---

interface PromptTemplate {
  fileKey: string;
  content: string;
  version: number;
}

interface HarborPrompts {
  sections: Record<string, string | undefined>;
  updatedAt: number;
}

interface PromptData {
  templates: PromptTemplate[];
  harborPrompts: HarborPrompts;
  harbor: { name: string; slug: string } | null;
}

interface HarborInfo {
  name: string;
  slug: string;
}

// --- Handlebars helpers ---

// Register {{#eq}} helper for conditional role blocks
Handlebars.registerHelper("eq", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
  return a === b ? options.fn(this) : options.inverse(this);
});

// --- Role display mapping ---

const ROLE_DISPLAY: Record<string, string> = {
  "project-manager": "Project Manager",
  "executive-assistant": "Executive Assistant",
  "software-developer": "Software Developer",
  "devops": "DevOps",
  "sales": "Sales",
  "marketing": "Marketing",
  "software-quality-assurance": "Software Quality Assurance",
  "copy-editor": "Copy Editor",
  "software-architect": "Software Architect",
  "business-analyst": "Business Analyst",
  "data-analyst": "Data Analyst",
  "system-administrator": "System Administrator",
};

function roleToDisplay(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

// --- Convex API ---

export async function fetchPromptData(api: ConvexApiConfig): Promise<PromptData> {
  const url = `${api.convexUrl}/api/daemon/prompts`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch prompts: ${res.status}`);
  return res.json();
}

// --- Template rendering ---

/** Compile and cache templates. */
const templateCache = new Map<string, { version: number; fn: Handlebars.TemplateDelegate }>();

function compileTemplate(t: PromptTemplate): Handlebars.TemplateDelegate {
  const cached = templateCache.get(t.fileKey);
  if (cached && cached.version === t.version) return cached.fn;

  const fn = Handlebars.compile(t.content, { noEscape: false });
  templateCache.set(t.fileKey, { version: t.version, fn });
  return fn;
}

function renderTemplate(
  template: PromptTemplate,
  agent: ConvexAgent,
  allAgents: ConvexAgent[],
  harbor: HarborInfo,
  sections: Record<string, string | undefined>,
): string {
  const fn = compileTemplate(template);
  const context = {
    agent: {
      ...agent,
      roleDisplay: roleToDisplay(agent.role),
    },
    harbor: {
      ...harbor,
      agents: allAgents.map((a) => ({
        ...a,
        roleDisplay: roleToDisplay(a.role),
      })),
    },
    sections,
  };
  return fn(context);
}

// --- File writing ---

/** Files that should never be overwritten by prompt sync. */
const PROTECTED_FILES = new Set(["MEMORY.md"]);

function writeIfChanged(filePath: string, content: string): boolean {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
  if (existing === content) return false;
  fs.writeFileSync(filePath, content);
  return true;
}

// --- Main sync ---

let lastSyncFingerprint = "";

export async function syncPrompts(
  api: ConvexApiConfig,
  agents: ConvexAgent[],
  workspacesDir: string,
): Promise<void> {
  // 1. Fetch templates + harbor sections + harbor info
  let data: PromptData;
  try {
    data = await fetchPromptData(api);
  } catch (err) {
    log(`Failed to fetch prompt data: ${err instanceof Error ? err.message : err}`);
    return;
  }

  if (!data.harbor) {
    log("No harbor info returned — skipping prompt sync");
    return;
  }

  const harbor: HarborInfo = data.harbor;

  // 2. Build fingerprint for change detection
  const fingerprint = JSON.stringify({
    versions: data.templates.map((t) => `${t.fileKey}:${t.version}`).sort(),
    sections: data.harborPrompts.updatedAt,
    agents: agents.map((a) => `${a.sessionKey}:${a.name}:${a.role}:${a.roleDescription ?? ""}:${a.additionalInstructions ?? ""}`).sort(),
  });

  if (fingerprint === lastSyncFingerprint) return;

  log(`Prompt changes detected — rendering for ${agents.length} agent(s)`);

  const sections = data.harborPrompts.sections ?? {};

  // 3. Render and write for each agent
  let filesWritten = 0;
  for (const agent of agents) {
    const agentDir = path.join(workspacesDir, agent.sessionKey);
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    for (const template of data.templates) {
      if (PROTECTED_FILES.has(template.fileKey)) continue;

      try {
        const rendered = renderTemplate(template, agent, agents, harbor, sections);
        const filePath = path.join(agentDir, template.fileKey);
        if (writeIfChanged(filePath, rendered)) {
          log(`  Updated ${template.fileKey} for ${agent.sessionKey}`);
          filesWritten++;
        }
      } catch (err) {
        log(`  Error rendering ${template.fileKey} for ${agent.sessionKey}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (filesWritten > 0) {
    log(`Wrote ${filesWritten} file(s)`);
  }
  lastSyncFingerprint = fingerprint;
}
