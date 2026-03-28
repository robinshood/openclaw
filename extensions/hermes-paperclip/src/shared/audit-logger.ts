/**
 * Audit logger — every agent action → Supabase audit_trail.
 *
 * CONSTRAINT: Every agent action must have:
 *   agent_id, action, rationale, confidence
 */

import { insertAuditEntry } from "../lib/supabase-client.ts";
import type { AuditEntry, Confidence, Environment, G4Status } from "./types.ts";

export interface LogOptions {
  agentId: string;
  action: string;
  targetType: string;
  targetId?: string;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  confidence: Confidence;
  rationale: string;
  g4Status?: G4Status;
}

/**
 * Log an agent action to the audit trail.
 * Called by every agent before and after operations.
 */
export async function logAction(opts: LogOptions): Promise<void> {
  const environment: Environment = process.env.TRIPLETEX_ENV === "prod" ? "production" : "sandbox";

  const entry: AuditEntry = {
    agentId: opts.agentId,
    action: opts.action,
    targetType: opts.targetType,
    targetId: opts.targetId,
    inputData: opts.inputData,
    outputData: opts.outputData,
    confidence: opts.confidence,
    rationale: opts.rationale,
    g4Status: opts.g4Status ?? "approved",
    environment,
  };

  await insertAuditEntry(entry);
}

/**
 * Format confidence footer for agent outputs.
 * Every output must end with: "Confidence Score: [H/M/L] | Reasoning: [why]"
 */
export function confidenceFooter(score: Confidence, reasoning: string): string {
  return `Confidence Score: ${score} | Reasoning: ${reasoning}`;
}
