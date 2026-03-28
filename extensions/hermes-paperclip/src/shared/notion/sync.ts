import type { NotionClient, NotionPage } from "./client.ts";

/**
 * Status values used for inter-agent communication via Notion.
 * Hermes and Paperclip do NOT talk to each other directly —
 * they communicate via status transitions on Notion pages.
 */
export const SyncStatus = {
  // Hermes → Paperclip handoff
  READY_FOR_GAP_ANALYSIS: "Ready for Gap Analysis",
  // Paperclip internal
  READY_FOR_SPRINT_PLANNING: "Ready for Sprint Planning",
  READY_FOR_EXECUTION: "Ready for Execution",
  // Execution states
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
  // Monitoring
  MONITORING: "Monitoring",
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

/**
 * Polls a Notion database for pages matching a target status.
 * Used by Paperclip to discover work items ready for processing.
 */
export async function pollForStatus(
  client: NotionClient,
  databaseId: string,
  targetStatus: SyncStatus,
): Promise<NotionPage[]> {
  return client.queryDatabase({
    databaseId,
    filter: {
      property: "Status",
      equals: targetStatus,
    },
  });
}

/**
 * Transitions a page to a new status.
 * This is the primary mechanism for agent-to-agent communication.
 */
export async function transitionStatus(
  client: NotionClient,
  pageId: string,
  newStatus: SyncStatus,
): Promise<void> {
  await client.updateStatus(pageId, newStatus);
}

/**
 * Marks a process map as ready for Paperclip to pick up.
 * Called by Hermes after completing process analysis.
 */
export async function markReadyForGapAnalysis(client: NotionClient, pageId: string): Promise<void> {
  await transitionStatus(client, pageId, SyncStatus.READY_FOR_GAP_ANALYSIS);
}

/**
 * Marks a gap analysis as ready for sprint planning.
 * Called by Paperclip after completing gap analysis.
 */
export async function markReadyForSprintPlanning(
  client: NotionClient,
  pageId: string,
): Promise<void> {
  await transitionStatus(client, pageId, SyncStatus.READY_FOR_SPRINT_PLANNING);
}
