import { z } from "zod";

/**
 * Notion page types used by Hermes and Paperclip agents.
 */
export const NotionPageType = {
  COMPANY_PROFILE: "Research",
  INFRASTRUCTURE_MAP: "Blueprint",
  PROCESS_MAP: "Blueprint",
  GAP_ANALYSIS: "Insight",
  SPRINT_PLAN: "Solution Canvas",
  SERVICE_REPORT: "Notes",
  ALERT_LOG: "Notes",
} as const;

export const NotionPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  pageType: z.string(),
  status: z.string().optional(),
  properties: z.record(z.string(), z.any()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotionPage = z.infer<typeof NotionPageSchema>;

export interface NotionMcpTransport {
  call(method: string, params: Record<string, unknown>): Promise<unknown>;
}

/**
 * Notion MCP client wrapper.
 *
 * All agent state lives in Notion — no local databases.
 * This client wraps MCP calls to the Notion MCP server.
 */
export class NotionClient {
  private transport: NotionMcpTransport;

  constructor(transport: NotionMcpTransport) {
    this.transport = transport;
  }

  async createPage(params: {
    databaseId: string;
    title: string;
    pageType: string;
    properties: Record<string, unknown>;
  }): Promise<NotionPage> {
    const result = await this.transport.call("notion_create_page", {
      database_id: params.databaseId,
      title: params.title,
      page_type: params.pageType,
      properties: params.properties,
    });
    return NotionPageSchema.parse(result);
  }

  async updatePage(params: {
    pageId: string;
    properties: Record<string, unknown>;
  }): Promise<NotionPage> {
    const result = await this.transport.call("notion_update_page", {
      page_id: params.pageId,
      properties: params.properties,
    });
    return NotionPageSchema.parse(result);
  }

  async getPage(pageId: string): Promise<NotionPage> {
    const result = await this.transport.call("notion_get_page", {
      page_id: pageId,
    });
    return NotionPageSchema.parse(result);
  }

  async queryDatabase(params: {
    databaseId: string;
    filter?: Record<string, unknown>;
    sorts?: Array<Record<string, unknown>>;
  }): Promise<NotionPage[]> {
    const result = await this.transport.call("notion_query_database", {
      database_id: params.databaseId,
      filter: params.filter,
      sorts: params.sorts,
    });
    const parsed = z.array(NotionPageSchema).parse(result);
    return parsed;
  }

  async updateStatus(pageId: string, status: string): Promise<void> {
    await this.updatePage({
      pageId,
      properties: { Status: status },
    });
  }
}

/**
 * Creates a mock Notion transport for sandbox testing.
 */
export function createMockTransport(): NotionMcpTransport & { pages: Map<string, NotionPage> } {
  const pages = new Map<string, NotionPage>();
  let counter = 0;

  return {
    pages,
    async call(method: string, params: Record<string, unknown>): Promise<unknown> {
      switch (method) {
        case "notion_create_page": {
          const id = `page-${++counter}`;
          const now = new Date().toISOString();
          const page: NotionPage = {
            id,
            title: params.title as string,
            pageType: params.page_type as string,
            status: "Draft",
            properties: params.properties as Record<string, unknown>,
            createdAt: now,
            updatedAt: now,
          };
          pages.set(id, page);
          return page;
        }
        case "notion_update_page": {
          const pageId = params.page_id as string;
          const existing = pages.get(pageId);
          if (!existing) throw new Error(`Page not found: ${pageId}`);
          const updated: NotionPage = {
            ...existing,
            properties: {
              ...existing.properties,
              ...(params.properties as Record<string, unknown>),
            },
            status:
              ((params.properties as Record<string, unknown>).Status as string) ?? existing.status,
            updatedAt: new Date().toISOString(),
          };
          pages.set(pageId, updated);
          return updated;
        }
        case "notion_get_page": {
          const page = pages.get(params.page_id as string);
          if (!page) throw new Error(`Page not found: ${params.page_id}`);
          return page;
        }
        case "notion_query_database": {
          return Array.from(pages.values());
        }
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    },
  };
}
