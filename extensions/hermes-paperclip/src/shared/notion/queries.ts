import type { NotionClient, NotionPage } from "./client.ts";
import { NotionPageType } from "./client.ts";

/**
 * Common Notion queries used by both Hermes and Paperclip agents.
 */

export async function getCompanyProfiles(
  client: NotionClient,
  databaseId: string,
): Promise<NotionPage[]> {
  return client.queryDatabase({
    databaseId,
    filter: { property: "PageType", equals: NotionPageType.COMPANY_PROFILE },
  });
}

export async function getProcessMaps(
  client: NotionClient,
  databaseId: string,
): Promise<NotionPage[]> {
  return client.queryDatabase({
    databaseId,
    filter: { property: "PageType", equals: NotionPageType.PROCESS_MAP },
  });
}

export async function getPendingGapAnalysis(
  client: NotionClient,
  databaseId: string,
): Promise<NotionPage[]> {
  return client.queryDatabase({
    databaseId,
    filter: {
      and: [
        { property: "PageType", equals: NotionPageType.PROCESS_MAP },
        { property: "Status", equals: "Ready for Gap Analysis" },
      ],
    },
  });
}

export async function getActiveSprintPlans(
  client: NotionClient,
  databaseId: string,
): Promise<NotionPage[]> {
  return client.queryDatabase({
    databaseId,
    filter: {
      and: [
        { property: "PageType", equals: NotionPageType.SPRINT_PLAN },
        { property: "Status", equals: "In Progress" },
      ],
    },
  });
}

export async function getAlerts(
  client: NotionClient,
  databaseId: string,
  severity?: string,
): Promise<NotionPage[]> {
  const filter: Record<string, unknown> = {
    property: "PageType",
    equals: NotionPageType.ALERT_LOG,
  };
  if (severity) {
    return client.queryDatabase({
      databaseId,
      filter: {
        and: [filter, { property: "Severity", equals: severity }],
      },
    });
  }
  return client.queryDatabase({ databaseId, filter });
}
