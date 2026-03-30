import type { FlowMode, ModesPolicy } from "./docset-parser.ts";

/**
 * Flow → Runtime Mode Mapper
 *
 * Maps Flow modes (Orchestrate, Build, Verify, Maintain) to
 * concrete runtime execution modes on Mac Mini.
 *
 * Flow modes are abstract (what the agent should do);
 * runtime modes are concrete (how to execute on the platform).
 */

export const RuntimeMode = {
  /** Coordinate between agents, route requests */
  DISPATCH: "dispatch",
  /** Execute API calls, process data */
  EXECUTE: "execute",
  /** Run tests, validate outputs */
  VALIDATE: "validate",
  /** Monitor health, collect metrics */
  MONITOR: "monitor",
  /** Idle — agent registered but not active */
  IDLE: "idle",
} as const;

export type RuntimeMode = (typeof RuntimeMode)[keyof typeof RuntimeMode];

export interface RuntimeModeConfig {
  mode: RuntimeMode;
  /** Whether the agent needs API access in this mode */
  requiresApiAccess: boolean;
  /** Whether the agent can write to external systems */
  canWrite: boolean;
  /** Maximum execution time in seconds */
  timeoutSeconds: number;
  /** Heartbeat interval in seconds (0 = no heartbeat) */
  heartbeatIntervalSeconds: number;
}

/** Map a single Flow mode to its runtime mode configuration */
export function mapFlowToRuntime(flowMode: FlowMode): RuntimeModeConfig {
  switch (flowMode) {
    case "orchestrate":
      return {
        mode: RuntimeMode.DISPATCH,
        requiresApiAccess: false,
        canWrite: false,
        timeoutSeconds: 300,
        heartbeatIntervalSeconds: 60,
      };
    case "build":
      return {
        mode: RuntimeMode.EXECUTE,
        requiresApiAccess: true,
        canWrite: true,
        timeoutSeconds: 600,
        heartbeatIntervalSeconds: 30,
      };
    case "verify":
      return {
        mode: RuntimeMode.VALIDATE,
        requiresApiAccess: true,
        canWrite: false,
        timeoutSeconds: 300,
        heartbeatIntervalSeconds: 0,
      };
    case "maintain":
      return {
        mode: RuntimeMode.MONITOR,
        requiresApiAccess: true,
        canWrite: false,
        timeoutSeconds: 120,
        heartbeatIntervalSeconds: 300,
      };
  }
}

/** Map a full ModesPolicy to a set of runtime configurations */
export function mapModesPolicy(policy: ModesPolicy): {
  defaultMode: RuntimeModeConfig;
  allowedModes: RuntimeModeConfig[];
} {
  return {
    defaultMode: mapFlowToRuntime(policy.defaultMode),
    allowedModes: policy.allowedModes.map(mapFlowToRuntime),
  };
}

/**
 * Check whether a mode transition is allowed by the policy.
 */
export function isTransitionAllowed(
  policy: ModesPolicy,
  from: FlowMode,
  to: FlowMode,
): { allowed: boolean; condition?: string } {
  const rule = policy.transitionRules.find((r) => r.from === from && r.to === to);
  if (rule) {
    return { allowed: true, condition: rule.condition };
  }

  // If both modes are in allowedModes and no explicit rule blocks it, allow
  if (policy.allowedModes.includes(from) && policy.allowedModes.includes(to)) {
    return { allowed: true };
  }

  return { allowed: false };
}
