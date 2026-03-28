/**
 * G4 Gate — Human-in-the-loop approval for all write operations.
 *
 * Every Tripletex write goes through here. The gate:
 * 1. Writes a pending entry to audit_trail
 * 2. Blocks until human approves/rejects
 * 3. Returns approval status
 *
 * In sandbox mode, the gate auto-approves (for testing).
 * In production, it blocks until explicit approval.
 */

import { insertAuditEntry } from "../lib/supabase-client.ts";
import type { AuditEntry, Confidence, G4Status } from "./types.ts";

export interface G4Request {
  agentId: string;
  action: string;
  targetType: string;
  targetId?: string;
  payload: Record<string, unknown>;
  confidence: Confidence;
  rationale: string;
}

export interface G4Decision {
  approved: boolean;
  status: G4Status;
  approvedBy?: string;
  reason?: string;
}

/**
 * Submit a write operation for G4 approval.
 * In sandbox: auto-approves.
 * In production: writes pending entry and returns pending status.
 */
export async function requestG4Approval(request: G4Request): Promise<G4Decision> {
  const environment = process.env.TRIPLETEX_ENV === "prod" ? "production" : "sandbox";

  const entry: AuditEntry = {
    agentId: request.agentId,
    action: request.action,
    targetType: request.targetType,
    targetId: request.targetId,
    inputData: request.payload,
    confidence: request.confidence,
    rationale: request.rationale,
    g4Status: environment === "sandbox" ? "approved" : "pending",
    environment,
  };

  await insertAuditEntry(entry);

  if (environment === "sandbox") {
    return {
      approved: true,
      status: "approved",
      approvedBy: "sandbox-auto",
      reason: "Auto-approved in sandbox environment",
    };
  }

  // Production: return pending — caller must poll or wait for webhook
  return {
    approved: false,
    status: "pending",
    reason: "Awaiting human approval in production",
  };
}

/**
 * Check if an action is blocked (production + pending).
 */
export function isBlocked(decision: G4Decision): boolean {
  return !decision.approved && decision.status === "pending";
}
