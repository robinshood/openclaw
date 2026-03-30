import type { NotionClient } from "../shared/notion/client.ts";
import type { AgentDocset, AgentDocsetStatus } from "./docset-parser.ts";
import type { RuntimeMode } from "./mode-mapper.ts";

/**
 * Runtime → Notion Sync-Back
 *
 * After agent execution on Mac Mini, syncs runtime status
 * back to the Notion Agent Library so ChilliFlake/Paperclip
 * can monitor agent health and status.
 */

export interface AgentRuntimeStatus {
  agentId: string;
  currentMode: RuntimeMode;
  status: AgentDocsetStatus;
  lastRunAt: string;
  lastRunDurationMs: number;
  lastRunSuccess: boolean;
  lastRunError?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    costCents: number;
  };
  metrics?: Record<string, number>;
}

/**
 * Sync agent runtime status back to the Notion Agent Library.
 * Updates the agent's page in the Agent Library database.
 */
export async function syncAgentStatus(
  client: NotionClient,
  pageId: string,
  status: AgentRuntimeStatus,
): Promise<void> {
  await client.updatePage(pageId, {
    properties: {
      Status: { select: { name: formatStatus(status.status) } },
      "Last Run": { date: { start: status.lastRunAt } },
      "Last Run Duration (ms)": { number: status.lastRunDurationMs },
      "Last Run Success": { checkbox: status.lastRunSuccess },
      "Current Mode": { select: { name: status.currentMode } },
      ...(status.lastRunError
        ? { "Last Error": { rich_text: [{ text: { content: status.lastRunError } }] } }
        : {}),
      ...(status.tokenUsage
        ? {
            "Token Usage (Input)": { number: status.tokenUsage.inputTokens },
            "Token Usage (Output)": { number: status.tokenUsage.outputTokens },
            "Cost (cents)": { number: status.tokenUsage.costCents },
          }
        : {}),
    },
  });
}

/**
 * Sync sandbox test results for an agent.
 * Creates a new child page under the agent with test evidence.
 */
export async function syncSandboxResults(
  client: NotionClient,
  parentDatabaseId: string,
  results: {
    agentId: string;
    agentName: string;
    testName: string;
    passed: boolean;
    accuracy?: number;
    duration: number;
    details: string;
    evidence: Record<string, unknown>;
  },
): Promise<string> {
  const page = await client.createPage({
    parentDatabaseId,
    properties: {
      Name: { title: [{ text: { content: `Sandbox: ${results.testName}` } }] },
      Agent: { rich_text: [{ text: { content: results.agentName } }] },
      "Agent ID": { rich_text: [{ text: { content: results.agentId } }] },
      Passed: { checkbox: results.passed },
      ...(results.accuracy !== undefined ? { Accuracy: { number: results.accuracy } } : {}),
      "Duration (ms)": { number: results.duration },
      "Test Date": { date: { start: new Date().toISOString() } },
    },
    content: [
      `## Test: ${results.testName}`,
      "",
      `**Result:** ${results.passed ? "PASSED" : "FAILED"}`,
      results.accuracy !== undefined ? `**Accuracy:** ${results.accuracy}%` : "",
      `**Duration:** ${results.duration}ms`,
      "",
      "### Details",
      results.details,
      "",
      "### Evidence",
      "```json",
      JSON.stringify(results.evidence, null, 2),
      "```",
    ].join("\n"),
  });

  return page.id;
}

/**
 * Register a parsed agent docset in the Agent Roster.
 * Creates or updates the agent's entry in the roster database.
 */
export async function registerInRoster(
  client: NotionClient,
  rosterDatabaseId: string,
  docset: AgentDocset,
): Promise<string> {
  // Check if agent already exists
  const existing = await client.queryDatabase({
    databaseId: rosterDatabaseId,
    filter: { property: "Agent ID", equals: docset.identity.agentId },
  });

  const properties = {
    Name: { title: [{ text: { content: docset.identity.name } }] },
    "Agent ID": { rich_text: [{ text: { content: docset.identity.agentId } }] },
    Version: { rich_text: [{ text: { content: docset.identity.version } }] },
    Package: { select: { name: docset.identity.package } },
    Status: { select: { name: formatStatus(docset.identity.status) } },
    "Source Page": { url: `https://notion.so/${docset.sourcePageId.replace(/-/g, "")}` },
    "Parsed At": { date: { start: docset.parsedAt } },
    "Default Mode": { select: { name: docset.modesPolicy.defaultMode } },
    Mission: { rich_text: [{ text: { content: docset.northStar.mission.slice(0, 2000) } }] },
  };

  if (existing.length > 0) {
    await client.updatePage(existing[0].id, { properties });
    return existing[0].id;
  }

  const page = await client.createPage({
    parentDatabaseId: rosterDatabaseId,
    properties,
  });

  return page.id;
}

/**
 * Check QA gate — only agents with status "validated" or better can be promoted.
 */
export function passesQaGate(docset: AgentDocset): boolean {
  const promotableStatuses: AgentDocsetStatus[] = ["validated", "sandbox", "production"];
  return promotableStatuses.includes(docset.identity.status);
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
