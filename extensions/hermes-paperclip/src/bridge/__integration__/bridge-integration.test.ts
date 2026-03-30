import { describe, it, expect, beforeAll } from "vitest";
import { NotionClient } from "../../shared/notion/client.ts";
import { parseIdentityBlock, parseAgentDocset } from "../docset-parser.ts";
import { syncAgentStatus, syncSandboxResults, registerInRoster } from "../sync-back.ts";

/**
 * Notion MCP Bridge integration tests.
 *
 * These tests run ONLY when NOTION_API_KEY and NOTION_AGENT_LIBRARY_DB are set.
 * They hit the real Notion API to validate the bridge pipeline end-to-end.
 *
 * Required env vars:
 * - NOTION_API_KEY: Notion integration token
 * - NOTION_AGENT_LIBRARY_DB: Database ID for the Agent Library
 * - NOTION_TEST_AGENT_PAGE: (optional) A specific agent page ID for parseAgentDocset
 * - NOTION_ROSTER_DB: (optional) Database ID for the Agent Roster
 *
 * Run: NOTION_API_KEY=xxx NOTION_AGENT_LIBRARY_DB=yyy pnpm test:integration
 * Skip: tests auto-skip when env vars are not set.
 */

const HAS_NOTION =
  Boolean(process.env.NOTION_API_KEY) && Boolean(process.env.NOTION_AGENT_LIBRARY_DB);

describe.skipIf(!HAS_NOTION)("Notion MCP Bridge Integration", () => {
  let client: NotionClient;
  const agentLibraryDb = process.env.NOTION_AGENT_LIBRARY_DB ?? "";
  const testAgentPage = process.env.NOTION_TEST_AGENT_PAGE;
  const rosterDb = process.env.NOTION_ROSTER_DB;

  beforeAll(() => {
    client = new NotionClient({
      transport: {
        async send(method, params) {
          // Use Notion REST API via fetch as transport
          const baseUrl = "https://api.notion.com/v1";
          const headers: Record<string, string> = {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          };

          let url: string;
          let fetchOpts: RequestInit;

          switch (method) {
            case "getPage":
              url = `${baseUrl}/pages/${params.pageId}`;
              fetchOpts = { method: "GET", headers };
              break;
            case "queryDatabase":
              url = `${baseUrl}/databases/${params.databaseId}/query`;
              fetchOpts = { method: "POST", headers, body: JSON.stringify(params.filter ?? {}) };
              break;
            case "createPage":
              url = `${baseUrl}/pages`;
              fetchOpts = { method: "POST", headers, body: JSON.stringify(params) };
              break;
            case "updatePage":
              url = `${baseUrl}/pages/${params.pageId}`;
              fetchOpts = { method: "PATCH", headers, body: JSON.stringify(params) };
              break;
            default:
              throw new Error(`Unknown method: ${method}`);
          }

          const res = await fetch(url, fetchOpts);
          return JSON.parse(await res.text());
        },
      },
    });
  });

  it("can query the Agent Library database", async () => {
    const results = await client.queryDatabase({ databaseId: agentLibraryDb });
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it.skipIf(!testAgentPage)(
    "parseAgentDocset extracts identity from a real agent page",
    async () => {
      const page = await client.getPage(testAgentPage!);
      const identity = parseIdentityBlock(page);
      expect(identity.agentId).toBeDefined();
      expect(identity.name.length).toBeGreaterThan(0);
    },
  );

  it("syncAgentStatus writes and reads back status", async () => {
    // Create a temporary test page
    const testPage = await client.createPage({
      parentDatabaseId: agentLibraryDb,
      properties: {
        Name: { title: [{ text: { content: "Integration Test Agent — safe to delete" } }] },
      },
    });
    expect(testPage.id).toBeDefined();

    // Write status
    await syncAgentStatus(client, testPage.id, {
      agentId: "integration-test",
      currentMode: "idle",
      status: "sandbox",
      lastRunAt: new Date().toISOString(),
      lastRunDurationMs: 42,
      lastRunSuccess: true,
    });

    // Read back
    const updated = await client.getPage(testPage.id);
    expect(updated).toBeDefined();
  });

  it("syncSandboxResults creates a test evidence page", async () => {
    const pageId = await syncSandboxResults(client, agentLibraryDb, {
      agentId: "integration-test",
      agentName: "Integration Test",
      testName: "Bridge Integration Smoke Test",
      passed: true,
      accuracy: 100,
      duration: 10,
      details: "Automated integration test — safe to delete",
      evidence: { test: true, timestamp: new Date().toISOString() },
    });
    expect(pageId).toBeDefined();
    expect(typeof pageId).toBe("string");
  });

  it.skipIf(!rosterDb)("registerInRoster creates or updates an agent entry", async () => {
    const pageId = await registerInRoster(client, rosterDb!, {
      identity: {
        agentId: "integration-test-agent",
        name: "Integration Test Agent",
        version: "0.0.1",
        package: "standard",
        status: "sandbox",
      },
      instructions: {
        role: "Test",
        objective: "Integration testing",
        constraints: [],
        successCriteria: [],
      },
      modesPolicy: {
        defaultMode: "orchestrate",
        allowedModes: ["orchestrate"],
        transitionRules: [],
      },
      northStar: { mission: "Test", metrics: [] },
      protocol: {
        inputFormat: "JSON",
        outputFormat: "JSON",
        errorHandling: "retry",
      },
      sourcePageId: "test-page-id",
      parsedAt: new Date().toISOString(),
    });
    expect(pageId).toBeDefined();
  });
});
