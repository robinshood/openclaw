import {
  FAILURE_MODE_DESCRIPTIONS,
  FailureMode,
  Severity,
  type FailureModeCheck,
  type InversionContext,
  type InversionResult,
} from "./types.ts";

/**
 * Keyword patterns that suggest each failure mode may be present.
 * Used for automated detection — human review is always recommended.
 */
const FAILURE_MODE_PATTERNS: Record<FailureMode, RegExp[]> = {
  [FailureMode.OVERSPEND]: [/unused.*license/i, /shelfware/i, /low.*utilization/i, /no.*user/i],
  [FailureMode.DISRUPTION]: [/replac/i, /migrat/i, /switch/i, /remov.*existing/i],
  [FailureMode.KNOWLEDGE_LOSS]: [/retir/i, /leav/i, /key.*person/i, /tacit/i, /undocumented/i],
  [FailureMode.DATA_LEAK]: [/shared.*tenant/i, /cross.*company/i, /multi.*tenant/i, /mix.*data/i],
  [FailureMode.PREMATURE_AUTOMATION]: [/automat.*before/i, /not.*understood/i, /unclear.*process/i],
  [FailureMode.DEPENDENCY_CREATION]: [
    /central/i,
    /shared.*infra/i,
    /single.*point/i,
    /cannot.*function.*independently/i,
  ],
  [FailureMode.MISSED_STANDARD]: [
    /custom.*build/i,
    /from.*scratch/i,
    /(?:instead of|replac(?:e|ing)).*(?:propell|sanna|tripletex)/i,
  ],
  [FailureMode.STALE_DATA]: [/last.*year/i, /outdated/i, /old.*data/i, /not.*updated/i],
};

/**
 * Generates failure mode checks for a given context.
 * Scans context description and options for patterns that match known failure modes.
 */
export function generateFailureModes(context: InversionContext): FailureModeCheck[] {
  const fullText = [
    context.description,
    ...context.options,
    context.companyContext ?? "",
    context.processContext ?? "",
  ].join(" ");

  return Object.values(FailureMode).map((mode) => {
    const patterns = FAILURE_MODE_PATTERNS[mode];
    const matches = patterns.filter((p) => p.test(fullText));
    const detected = matches.length > 0;

    return {
      mode,
      detected,
      evidence: detected
        ? `Pattern matches found in context for: ${FAILURE_MODE_DESCRIPTIONS[mode]}`
        : "No indicators detected",
      severity: detected ? inferSeverity(mode) : Severity.LOW,
    };
  });
}

/**
 * Evaluates a single option against failure modes.
 * An option is ELIMINATED if any failure mode is detected AND no human override exists.
 */
export function evaluateOption(option: string, failureModes: FailureModeCheck[]): InversionResult {
  const detectedModes = failureModes.filter((fm) => fm.detected);
  const nonOverriddenModes = detectedModes.filter((fm) => !fm.humanOverride);

  return {
    option,
    failureModes,
    eliminated: nonOverriddenModes.length > 0,
    eliminationReasons: nonOverriddenModes.map(
      (fm) => `${fm.mode}: ${FAILURE_MODE_DESCRIPTIONS[fm.mode]}`,
    ),
  };
}

/**
 * Evaluates all options in a context against failure modes.
 * Returns InversionResult for each option.
 */
export function evaluateAllOptions(context: InversionContext): InversionResult[] {
  return context.options.map((option) => {
    const optionContext: InversionContext = {
      ...context,
      description: `${context.description} — evaluating option: ${option}`,
      options: [option],
    };
    const failureModes = generateFailureModes(optionContext);
    return evaluateOption(option, failureModes);
  });
}

/**
 * Applies a human override to a failure mode check.
 * Requires documented rationale — decisions without rationale are rejected.
 */
export function applyHumanOverride(check: FailureModeCheck, rationale: string): FailureModeCheck {
  if (!rationale.trim()) {
    throw new Error("Human override requires documented rationale");
  }
  return {
    ...check,
    humanOverride: true,
    overrideRationale: rationale,
  };
}

/**
 * Infers severity based on the failure mode type.
 * DATA_LEAK and KNOWLEDGE_LOSS are always CRITICAL.
 */
function inferSeverity(mode: FailureMode): Severity {
  switch (mode) {
    case FailureMode.DATA_LEAK:
    case FailureMode.KNOWLEDGE_LOSS:
      return Severity.CRITICAL;
    case FailureMode.OVERSPEND:
    case FailureMode.DISRUPTION:
    case FailureMode.PREMATURE_AUTOMATION:
      return Severity.HIGH;
    case FailureMode.DEPENDENCY_CREATION:
    case FailureMode.MISSED_STANDARD:
      return Severity.MEDIUM;
    case FailureMode.STALE_DATA:
      return Severity.MEDIUM;
  }
}
