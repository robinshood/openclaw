/**
 * Paperclip runtime configuration.
 *
 * This file configures the Paperclip server for the Hermes x Paperclip
 * Systemregnskap platform. It defines how agents are executed, where
 * data is stored, and what integrations are active.
 *
 * Usage:
 *   npx paperclip start          # Start with this config
 *   npx paperclip start --dev    # Dev mode (sandbox, auto-approve G4)
 *
 * Mac Mini deployment:
 *   Works well for sandbox/dev. The server is Node.js-based, needs ~512MB RAM.
 *   Cron heartbeats run in-process (no external scheduler needed).
 *   For production: consider a VPS or Supabase Edge Functions for uptime.
 */

import { HEARTBEAT_CONFIGS, BUDGET_CONFIGS } from "./src/orchestration/config.ts";
import type { HeartbeatConfig } from "./src/orchestration/types.ts";

export default {
  // --- Server ---
  server: {
    port: 4820,
    host: "0.0.0.0",
  },

  // --- Company ---
  company: {
    configPath: "./company.yaml",
    agentsPath: "./AGENTS.md",
  },

  // --- Database (Supabase) ---
  database: {
    provider: "supabase",
    url: process.env.SUPABASE_URL ?? "http://localhost:54321",
    serviceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
    tables: {
      agentRuns: "agent_runs",
      auditTrail: "audit_trail",
      dispatchQueue: "voucher_queue", // reuses existing table
    },
  },

  // --- Agent Execution ---
  agents: {
    // Each agent type determines how Paperclip invokes it
    executors: {
      "paperclip-wash-01": { type: "function", module: "./src/agents/renvasken/index.ts" },
      "hermes-bilag-01": { type: "function", module: "./src/agents/bilagsansen/index.ts" },
      "hermes-rapport-01": { type: "function", module: "./src/agents/portalklar/index.ts" },
      "paperclip-onboard-01": { type: "function", module: "./src/agents/velkomst/index.ts" },
      "paperclip-tid-01": { type: "function", module: "./src/agents/tidsvokter/index.ts" },
    },
  },

  // --- Heartbeats ---
  heartbeats: HEARTBEAT_CONFIGS,

  // --- Budgets ---
  budgets: BUDGET_CONFIGS,

  // --- Governance ---
  governance: {
    g4Gate: {
      enabled: true,
      // In dev/sandbox mode, G4 auto-approves all writes
      autoApprove: process.env.NODE_ENV !== "production",
    },
    auditTrail: {
      enabled: true,
      retentionDays: 2555, // 7 years (Bokforingsloven)
    },
  },

  // --- Integrations ---
  integrations: {
    tripletex: {
      consumerToken: process.env.TRIPLETEX_CONSUMER_TOKEN ?? "",
      employeeToken: process.env.TRIPLETEX_EMPLOYEE_TOKEN ?? "",
      environment: (process.env.TRIPLETEX_ENV as "sandbox" | "production") ?? "sandbox",
    },
    brreg: {
      baseUrl: "https://data.brreg.no/enhetsregisteret/api",
    },
  },

  // --- Dashboard ---
  dashboard: {
    enabled: true,
    path: "./app/dist",
    port: 4821,
  },
};
