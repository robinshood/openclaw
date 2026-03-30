import { z } from "zod";
import type { NotionClient, NotionPage } from "../shared/notion/client.ts";

/**
 * Flow → Runtime Bridge: Docset Parser
 *
 * Parses Flow agent docsets from Notion's Agent Library into
 * runtime-ready agent configurations.
 *
 * Pipeline:
 * 1. Fetch agent index page from Agent Library
 * 2. Parse Identity Block (agent ID, package, version, status)
 * 3. Traverse sub-item relations → fetch instructions, modes, protocol
 * 4. Build AgentDocset for runtime registration
 */

// --- Schemas ---

export const AgentPackage = {
  STANDARD: "standard",
  PREMIUM: "premium",
  CUSTOM: "custom",
} as const;

export type AgentPackage = (typeof AgentPackage)[keyof typeof AgentPackage];

export const AgentDocsetStatus = {
  DRAFT: "draft",
  VALIDATED: "validated",
  SANDBOX: "sandbox",
  PRODUCTION: "production",
  ARCHIVED: "archived",
} as const;

export type AgentDocsetStatus = (typeof AgentDocsetStatus)[keyof typeof AgentDocsetStatus];

export const FlowMode = {
  ORCHESTRATE: "orchestrate",
  BUILD: "build",
  VERIFY: "verify",
  MAINTAIN: "maintain",
} as const;

export type FlowMode = (typeof FlowMode)[keyof typeof FlowMode];

export const IdentityBlockSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  version: z.string(),
  package: z.enum(["standard", "premium", "custom"]),
  status: z.enum(["draft", "validated", "sandbox", "production", "archived"]),
  createdBy: z.string().optional(),
  lastModified: z.string().optional(),
});
export type IdentityBlock = z.infer<typeof IdentityBlockSchema>;

export const InstructionBlockSchema = z.object({
  role: z.string(),
  objective: z.string(),
  constraints: z.array(z.string()),
  successCriteria: z.array(z.string()),
});
export type InstructionBlock = z.infer<typeof InstructionBlockSchema>;

export const ModesPolicySchema = z.object({
  defaultMode: z.enum(["orchestrate", "build", "verify", "maintain"]),
  allowedModes: z.array(z.enum(["orchestrate", "build", "verify", "maintain"])),
  transitionRules: z.array(
    z.object({
      from: z.enum(["orchestrate", "build", "verify", "maintain"]),
      to: z.enum(["orchestrate", "build", "verify", "maintain"]),
      condition: z.string(),
    }),
  ),
});
export type ModesPolicy = z.infer<typeof ModesPolicySchema>;

export const NorthStarSchema = z.object({
  mission: z.string(),
  metrics: z.array(
    z.object({
      name: z.string(),
      target: z.string(),
      current: z.string().optional(),
    }),
  ),
});
export type NorthStar = z.infer<typeof NorthStarSchema>;

export const ProtocolSchema = z.object({
  inputFormat: z.string(),
  outputFormat: z.string(),
  errorHandling: z.string(),
  retryPolicy: z
    .object({
      maxRetries: z.number(),
      backoffMs: z.number(),
    })
    .optional(),
});
export type Protocol = z.infer<typeof ProtocolSchema>;

export const AgentDocsetSchema = z.object({
  identity: IdentityBlockSchema,
  instructions: InstructionBlockSchema,
  modesPolicy: ModesPolicySchema,
  northStar: NorthStarSchema,
  protocol: ProtocolSchema,
  sourcePageId: z.string(),
  parsedAt: z.string().datetime(),
});
export type AgentDocset = z.infer<typeof AgentDocsetSchema>;

// --- Parser ---

/**
 * Parse a Notion page's properties into an IdentityBlock.
 */
export function parseIdentityBlock(page: NotionPage): IdentityBlock {
  const props = page.properties ?? {};

  return IdentityBlockSchema.parse({
    agentId: extractText(props, "Agent ID") ?? page.id,
    name: extractText(props, "Name") ?? extractText(props, "title") ?? "unknown",
    version: extractText(props, "Version") ?? "0.0.0",
    package: extractSelect(props, "Package") ?? "standard",
    status: extractSelect(props, "Status") ?? "draft",
    createdBy: extractText(props, "Created By"),
    lastModified: page.last_edited_time,
  });
}

/**
 * Parse structured content blocks from a Notion page into instruction blocks.
 * Expects the page to have headings: Role, Objective, Constraints, Success Criteria.
 */
export function parseInstructionBlock(content: string): InstructionBlock {
  const sections = parseSections(content);

  return InstructionBlockSchema.parse({
    role: sections["role"] ?? "",
    objective: sections["objective"] ?? "",
    constraints: parseList(sections["constraints"] ?? ""),
    successCriteria: parseList(sections["success criteria"] ?? sections["success_criteria"] ?? ""),
  });
}

/**
 * Parse modes policy from a Notion page's content.
 */
export function parseModesPolicyBlock(content: string): ModesPolicy {
  const sections = parseSections(content);

  const defaultMode = (sections["default mode"] ??
    sections["default_mode"] ??
    "orchestrate") as FlowMode;
  const allowedStr = sections["allowed modes"] ?? sections["allowed_modes"] ?? "";
  const allowedModes = allowedStr
    ? (allowedStr.split(",").map((m) => m.trim().toLowerCase()) as FlowMode[])
    : [defaultMode];

  // Parse transition rules from list format: "orchestrate → build: when tests pass"
  const transitionStr = sections["transitions"] ?? sections["transition rules"] ?? "";
  const transitionRules = parseList(transitionStr)
    .map((line) => {
      const match = line.match(/^(\w+)\s*(?:→|->|>)+\s*(\w+):\s*(.+)$/);
      if (!match) return null;
      return { from: match[1] as FlowMode, to: match[2] as FlowMode, condition: match[3] };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return ModesPolicySchema.parse({ defaultMode, allowedModes, transitionRules });
}

/**
 * Parse a north star definition from content.
 */
export function parseNorthStarBlock(content: string): NorthStar {
  const sections = parseSections(content);
  const mission = sections["mission"] ?? "";
  const metricsStr = sections["metrics"] ?? "";

  const metrics = parseList(metricsStr).map((line) => {
    // Expected format: "Metric Name: target value (current: X)"
    const match = line.match(/^(.+?):\s*(.+?)(?:\s*\(current:\s*(.+?)\))?$/);
    if (!match) return { name: line, target: "TBD" };
    return { name: match[1].trim(), target: match[2].trim(), current: match[3]?.trim() };
  });

  return NorthStarSchema.parse({ mission, metrics });
}

/**
 * Parse protocol definition from content.
 */
export function parseProtocolBlock(content: string): Protocol {
  const sections = parseSections(content);

  return ProtocolSchema.parse({
    inputFormat: sections["input format"] ?? sections["input"] ?? "JSON",
    outputFormat: sections["output format"] ?? sections["output"] ?? "JSON",
    errorHandling: sections["error handling"] ?? sections["errors"] ?? "retry",
    retryPolicy: sections["retry policy"]
      ? {
          maxRetries: parseInt(sections["max retries"] ?? "3", 10),
          backoffMs: parseInt(sections["backoff"] ?? "1000", 10),
        }
      : undefined,
  });
}

/**
 * Fetch and parse a complete agent docset from Notion.
 *
 * Expects the agent to have sub-pages:
 * - Instructions
 * - Modes Policy
 * - North Star
 * - Protocol
 */
export async function parseAgentDocset(
  client: NotionClient,
  agentPageId: string,
): Promise<AgentDocset> {
  // Fetch the main agent page
  const page = await client.getPage(agentPageId);
  const identity = parseIdentityBlock(page);

  // Fetch sub-pages by querying children
  const children = await client.queryDatabase({
    databaseId: agentPageId,
    filter: { property: "Parent", equals: agentPageId },
  });

  const childMap = new Map<string, NotionPage>();
  for (const child of children) {
    const title = extractPageTitle(child)?.toLowerCase() ?? "";
    childMap.set(title, child);
  }

  // Parse each sub-page's content
  const instructionsContent = await getPageContent(client, childMap, "instructions");
  const modesContent = await getPageContent(client, childMap, "modes policy");
  const northStarContent = await getPageContent(client, childMap, "north star");
  const protocolContent = await getPageContent(client, childMap, "protocol");

  return AgentDocsetSchema.parse({
    identity,
    instructions: parseInstructionBlock(instructionsContent),
    modesPolicy: parseModesPolicyBlock(modesContent),
    northStar: parseNorthStarBlock(northStarContent),
    protocol: parseProtocolBlock(protocolContent),
    sourcePageId: agentPageId,
    parsedAt: new Date().toISOString(),
  });
}

// --- Helpers ---

function extractText(props: Record<string, unknown>, key: string): string | undefined {
  const prop = props[key] as
    | { rich_text?: { plain_text: string }[]; title?: { plain_text: string }[] }
    | undefined;
  if (!prop) return undefined;
  const texts = prop.rich_text ?? prop.title;
  if (!texts || texts.length === 0) return undefined;
  return texts.map((t) => t.plain_text).join("");
}

function extractSelect(props: Record<string, unknown>, key: string): string | undefined {
  const prop = props[key] as { select?: { name: string } } | undefined;
  return prop?.select?.name?.toLowerCase();
}

function extractPageTitle(page: NotionPage): string | undefined {
  if (!page.properties) return undefined;
  for (const prop of Object.values(page.properties)) {
    const p = prop as { title?: { plain_text: string }[] };
    if (p.title && p.title.length > 0) {
      return p.title.map((t) => t.plain_text).join("");
    }
  }
  return undefined;
}

/** Split content into heading → body sections */
function parseSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentHeading = "";

  for (const line of content.split("\n")) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim().toLowerCase();
      sections[currentHeading] = "";
    } else if (currentHeading) {
      sections[currentHeading] = (sections[currentHeading] + "\n" + line).trim();
    }
  }

  return sections;
}

/** Parse a bullet list from text content */
function parseList(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

async function getPageContent(
  client: NotionClient,
  childMap: Map<string, NotionPage>,
  key: string,
): Promise<string> {
  const page = childMap.get(key);
  if (!page) return "";
  // Retrieve page content via the client
  const blocks = await client.getPage(page.id);
  return blocks.content ?? "";
}
