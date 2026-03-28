import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * Environment configuration for the Hermes × Paperclip agents.
 */
export interface AgentConfig {
  notionApiKey: string;
  notionDatabaseId: string;
  notionMcpUrl: string;
  environment: "sandbox" | "staging" | "production";
}

/**
 * Loads agent configuration from environment variables.
 */
export function loadConfig(): AgentConfig {
  return {
    notionApiKey: requireEnv("NOTION_API_KEY"),
    notionDatabaseId: requireEnv("NOTION_DATABASE_ID"),
    notionMcpUrl: process.env.NOTION_MCP_URL ?? "https://mcp.notion.com/mcp",
    environment: (process.env.AGENT_ENVIRONMENT as AgentConfig["environment"]) ?? "sandbox",
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Loads and parses a YAML config file relative to the config/ directory.
 */
export function loadYamlConfig<T>(filename: string, configDir?: string): T {
  const dir = configDir ?? resolve(import.meta.dirname, "../../../config");
  const filePath = resolve(dir, filename);
  const content = readFileSync(filePath, "utf-8");
  return parseYaml(content) as T;
}
