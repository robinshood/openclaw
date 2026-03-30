import type { EttosConfig } from "./env.ts";

/**
 * Sandbox guard — gates all write operations.
 *
 * In sandbox mode: writes go to Tripletex sandbox API (test environment).
 * In production mode: writes require PROD_CONFIRM=true AND a human approval callback.
 *
 * This implements the G4 (Gate 4) human-in-the-loop requirement from SC-EAAP.
 */

export class SandboxGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxGuardError";
  }
}

export type HumanApprovalFn = (operation: WriteOperation) => Promise<boolean>;

export interface WriteOperation {
  /** Which agent is requesting the write */
  agent: string;
  /** Target system (e.g., "tripletex", "notion") */
  target: string;
  /** HTTP method or operation type */
  method: string;
  /** API endpoint or resource path */
  endpoint: string;
  /** Human-readable description of what this write does */
  description: string;
  /** The payload being written (for audit logging) */
  payload?: unknown;
}

/**
 * Creates a sandbox guard that wraps write operations.
 *
 * Usage:
 * ```ts
 * const guard = createSandboxGuard(config, async (op) => {
 *   return await askUserForApproval(op.description);
 * });
 * await guard.check({ agent: "bilagsansen", target: "tripletex", ... });
 * ```
 */
export function createSandboxGuard(config: EttosConfig, humanApproval?: HumanApprovalFn) {
  return {
    /**
     * Checks whether a write operation is allowed.
     * - Sandbox: always allowed (goes to test API).
     * - Production: requires PROD_CONFIRM=true AND human approval callback.
     * Throws SandboxGuardError if blocked.
     */
    async check(operation: WriteOperation): Promise<void> {
      if (config.env === "sandbox") {
        return; // Sandbox writes are always allowed
      }

      // Production gate
      if (!config.prodConfirm) {
        throw new SandboxGuardError(
          `Production write blocked: PROD_CONFIRM is not set. ` +
            `Operation: ${operation.agent} → ${operation.target} ${operation.method} ${operation.endpoint}`,
        );
      }

      if (!humanApproval) {
        throw new SandboxGuardError(
          `Production write blocked: no human approval callback configured. ` +
            `Operation: ${operation.agent} → ${operation.target} ${operation.method} ${operation.endpoint}`,
        );
      }

      const approved = await humanApproval(operation);
      if (!approved) {
        throw new SandboxGuardError(
          `Production write rejected by human. ` +
            `Operation: ${operation.agent} → ${operation.target} ${operation.method} ${operation.endpoint}`,
        );
      }
    },

    /** Returns true if the current environment is sandbox. */
    isSandbox(): boolean {
      return config.env === "sandbox";
    },

    /** Returns true if the current environment is production with PROD_CONFIRM. */
    isProductionConfirmed(): boolean {
      return config.env === "production" && config.prodConfirm;
    },
  };
}

export type SandboxGuard = ReturnType<typeof createSandboxGuard>;
