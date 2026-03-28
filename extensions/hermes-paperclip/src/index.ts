/**
 * Hermes × Paperclip — Systemregnskap Automation Platform
 *
 * Entry point. Exports all agents and shared utilities.
 *
 * Architecture:
 *   Hermes  = Portfolio intelligence (client-facing agents)
 *   Paperclip = Infrastructure automation (internal agents)
 *
 * Data flow (ALWAYS):
 *   Source → Renvasken → Supabase (clean) → Agent → Output
 *
 * Agents (by priority):
 *   4.8  Renvasken    — Data quality gate (Paperclip)
 *   4.1  Bilagsansen  — Credit card voucher automation (Hermes)
 *   3.7  Portalklar   — Monthly client reports (Hermes)
 *   3.6  Velkomst     — Client onboarding (Paperclip)
 *   3.5  Tidsvokter   — Time tracking & profitability (Paperclip)
 */

// Agents
export * as renvasken from "./agents/renvasken/index.ts";
export * as bilagsansen from "./agents/bilagsansen/index.ts";
export * as portalklar from "./agents/portalklar/index.ts";
export * as velkomst from "./agents/velkomst/index.ts";
export * as tidsvokter from "./agents/tidsvokter/index.ts";

// Shared
export * from "./shared/types.ts";
export { logAction, confidenceFooter } from "./shared/audit-logger.ts";
export { requestG4Approval, isBlocked } from "./shared/g4-gate.ts";

// Lib
export { TripletexClient, createTripletexClient } from "./lib/tripletex-client.ts";
export { getSupabaseClient, setSupabaseClient } from "./lib/supabase-client.ts";
export { calculatePriority } from "./lib/priority-scorer.ts";

// Config
export { AGENTS } from "./config/agents.config.ts";
export { getTripletexBase, ENDPOINTS } from "./config/tripletex.config.ts";

// Orchestration (Paperclip AI)
export * as orchestration from "./orchestration/index.ts";
