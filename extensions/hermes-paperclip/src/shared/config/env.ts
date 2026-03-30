import { z } from "zod";

/**
 * ettOS environment configuration.
 * Controls sandbox vs production behavior across all agents.
 */

export const EttosEnv = {
  SANDBOX: "sandbox",
  PRODUCTION: "production",
} as const;

export type EttosEnv = (typeof EttosEnv)[keyof typeof EttosEnv];

const EttosConfigSchema = z.object({
  env: z.enum(["sandbox", "production"]).default("sandbox"),
  prodConfirm: z.boolean().default(false),
  tripletex: z.object({
    token: z.string().min(1),
    companyId: z.string().min(1),
    baseUrl: z.string().url(),
  }),
  notion: z.object({
    apiKey: z.string().min(1),
    databaseId: z.string().min(1),
    mcpUrl: z.string().url().default("https://mcp.notion.com/mcp"),
  }),
  brreg: z.object({
    baseUrl: z.string().url().default("https://data.brreg.no/enhetsregisteret/api"),
  }),
});

export type EttosConfig = z.infer<typeof EttosConfigSchema>;

const TRIPLETEX_SANDBOX_URL = "https://api.tripletex.io/v2";
const TRIPLETEX_PROD_URL = "https://tripletex.no/v2";

/**
 * Loads ettOS configuration from environment variables.
 * Defaults to sandbox mode with sandbox API endpoints.
 */
export function loadEttosConfig(): EttosConfig {
  const env = (process.env.ETTOS_ENV as EttosEnv) ?? EttosEnv.SANDBOX;
  const isSandbox = env === EttosEnv.SANDBOX;

  return EttosConfigSchema.parse({
    env,
    prodConfirm: process.env.PROD_CONFIRM === "true",
    tripletex: {
      token: process.env.TRIPLETEX_TOKEN ?? "",
      companyId: process.env.TRIPLETEX_COMPANY_ID ?? "",
      baseUrl: isSandbox ? TRIPLETEX_SANDBOX_URL : TRIPLETEX_PROD_URL,
    },
    notion: {
      apiKey: process.env.NOTION_API_KEY ?? "",
      databaseId: process.env.NOTION_DATABASE_ID ?? "",
      mcpUrl: process.env.NOTION_MCP_URL,
    },
    brreg: {
      baseUrl: process.env.BRREG_BASE_URL,
    },
  });
}

/**
 * Returns true if we're running in sandbox mode.
 */
export function isSandbox(config: EttosConfig): boolean {
  return config.env === EttosEnv.SANDBOX;
}

/**
 * Returns true if we're running in production mode.
 */
export function isProduction(config: EttosConfig): boolean {
  return config.env === EttosEnv.PRODUCTION;
}
