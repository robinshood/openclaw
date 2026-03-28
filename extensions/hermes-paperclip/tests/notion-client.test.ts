import { describe, expect, it } from "vitest";
import { createMockTransport, NotionClient } from "../src/shared/notion/client.ts";
import { SyncStatus, pollForStatus, transitionStatus } from "../src/shared/notion/sync.ts";

describe("NotionClient (mock)", () => {
  it("creates and retrieves a page", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    const page = await client.createPage({
      databaseId: "db-1",
      title: "Test Profile",
      pageType: "Research",
      properties: { Name: "Systemregnskap" },
    });

    expect(page.id).toBe("page-1");
    expect(page.title).toBe("Test Profile");
    expect(page.pageType).toBe("Research");
    expect(page.status).toBe("Draft");

    const fetched = await client.getPage(page.id);
    expect(fetched.title).toBe("Test Profile");
  });

  it("updates a page", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    const page = await client.createPage({
      databaseId: "db-1",
      title: "Test",
      pageType: "Blueprint",
      properties: { Value: 1 },
    });

    const updated = await client.updatePage({
      pageId: page.id,
      properties: { Value: 2, Extra: "new" },
    });

    expect(updated.properties.Value).toBe(2);
    expect(updated.properties.Extra).toBe("new");
  });

  it("queries database returns all pages", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    await client.createPage({
      databaseId: "db-1",
      title: "A",
      pageType: "Research",
      properties: {},
    });
    await client.createPage({
      databaseId: "db-1",
      title: "B",
      pageType: "Blueprint",
      properties: {},
    });

    const results = await client.queryDatabase({ databaseId: "db-1" });
    expect(results).toHaveLength(2);
  });

  it("throws on get non-existent page", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    await expect(client.getPage("nonexistent")).rejects.toThrow("not found");
  });

  it("updates status via updateStatus helper", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    const page = await client.createPage({
      databaseId: "db-1",
      title: "Process Map",
      pageType: "Blueprint",
      properties: {},
    });

    await client.updateStatus(page.id, "Ready for Gap Analysis");

    const updated = await client.getPage(page.id);
    expect(updated.status).toBe("Ready for Gap Analysis");
  });
});

describe("Notion Sync", () => {
  it("transitions status correctly", async () => {
    const transport = createMockTransport();
    const client = new NotionClient(transport);

    const page = await client.createPage({
      databaseId: "db-1",
      title: "Test",
      pageType: "Blueprint",
      properties: {},
    });

    await transitionStatus(client, page.id, SyncStatus.READY_FOR_GAP_ANALYSIS);

    const updated = await client.getPage(page.id);
    expect(updated.status).toBe("Ready for Gap Analysis");
  });
});
