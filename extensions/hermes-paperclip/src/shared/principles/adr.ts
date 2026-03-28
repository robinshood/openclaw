import { z } from "zod";
import type { DecisionMatrixResult, PipelineResult } from "./types.ts";

/**
 * Architecture Decision Record (ADR) framework.
 *
 * Every significant decision made by Hermes or Paperclip is documented
 * as an ADR with full context, options considered, rationale, and consequences.
 *
 * Follows principles from:
 * - Michael Nygard's ADR format (Title, Status, Context, Decision, Consequences)
 * - Lightweight ADR (LADR) for operational decisions
 * - Decision outcome tracking for continuous improvement
 */

export const AdrStatus = {
  PROPOSED: "PROPOSED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  DEPRECATED: "DEPRECATED",
  SUPERSEDED: "SUPERSEDED",
} as const;
export type AdrStatus = (typeof AdrStatus)[keyof typeof AdrStatus];

export const AdrCategory = {
  ARCHITECTURE: "ARCHITECTURE",
  INTEGRATION: "INTEGRATION",
  PROCESS: "PROCESS",
  SECURITY: "SECURITY",
  DATA: "DATA",
  OPERATIONS: "OPERATIONS",
  TOOLING: "TOOLING",
} as const;
export type AdrCategory = (typeof AdrCategory)[keyof typeof AdrCategory];

export const AdrSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  status: z.enum(["PROPOSED", "ACCEPTED", "REJECTED", "DEPRECATED", "SUPERSEDED"]),
  category: z.enum([
    "ARCHITECTURE",
    "INTEGRATION",
    "PROCESS",
    "SECURITY",
    "DATA",
    "OPERATIONS",
    "TOOLING",
  ]),
  date: z.string().datetime(),

  // Context: Why is this decision needed?
  context: z.string().min(1),

  // Problem statement: What exactly are we deciding?
  problem: z.string().min(1),

  // Options considered (from decision matrix)
  optionsConsidered: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      score: z.number().optional(),
      eliminated: z.boolean().optional(),
      eliminationReason: z.string().optional(),
    }),
  ),

  // Decision: What was decided and why?
  decision: z.string().min(1),
  rationale: z.string().min(1),

  // Consequences: What follows from this decision?
  consequences: z.object({
    positive: z.array(z.string()),
    negative: z.array(z.string()),
    risks: z.array(z.string()),
  }),

  // Traceability
  decisionPipelineResult: z.any().optional(),
  supersededBy: z.string().optional(),
  relatedAdrs: z.array(z.string()).optional(),

  // Participants
  decisionMaker: z.string(),
  stakeholders: z.array(z.string()).optional(),
});
export type Adr = z.infer<typeof AdrSchema>;

let adrCounter = 0;

/**
 * Creates an ADR from a completed decision pipeline result.
 * This ensures every pipeline decision is formally documented.
 */
export function createAdrFromPipeline(params: {
  title: string;
  category: AdrCategory;
  context: string;
  problem: string;
  pipelineResult: PipelineResult;
  decision: string;
  rationale: string;
  consequences: Adr["consequences"];
  decisionMaker: string;
  stakeholders?: string[];
}): Adr {
  const matrix = params.pipelineResult.matrix;
  const inversions = params.pipelineResult.inversions;

  const optionsConsidered = inversions.map((inv) => {
    const matrixResult = matrix?.results.find((r) => r.option === inv.option);
    return {
      name: inv.option,
      description: inv.option,
      pros: inv.eliminated ? [] : ["Passed failure mode checks"],
      cons: inv.eliminationReasons,
      score: matrixResult?.totalScore,
      eliminated: inv.eliminated,
      eliminationReason: inv.eliminated ? inv.eliminationReasons.join("; ") : undefined,
    };
  });

  return {
    id: `ADR-${String(++adrCounter).padStart(4, "0")}`,
    title: params.title,
    status: AdrStatus.PROPOSED,
    category: params.category,
    date: new Date().toISOString(),
    context: params.context,
    problem: params.problem,
    optionsConsidered,
    decision: params.decision,
    rationale: params.rationale,
    consequences: params.consequences,
    decisionPipelineResult: params.pipelineResult,
    decisionMaker: params.decisionMaker,
    stakeholders: params.stakeholders,
  };
}

/**
 * Formats an ADR as a Markdown document for Notion or documentation.
 */
export function formatAdrMarkdown(adr: Adr): string {
  const lines: string[] = [
    `# ${adr.id}: ${adr.title}`,
    "",
    `**Status:** ${adr.status}`,
    `**Category:** ${adr.category}`,
    `**Date:** ${adr.date}`,
    `**Decision Maker:** ${adr.decisionMaker}`,
  ];

  if (adr.stakeholders?.length) {
    lines.push(`**Stakeholders:** ${adr.stakeholders.join(", ")}`);
  }

  lines.push("", "## Context", "", adr.context);
  lines.push("", "## Problem", "", adr.problem);

  lines.push("", "## Options Considered", "");
  for (const opt of adr.optionsConsidered) {
    const status = opt.eliminated
      ? " (ELIMINATED)"
      : opt.score
        ? ` (Score: ${opt.score.toFixed(2)})`
        : "";
    lines.push(`### ${opt.name}${status}`, "");
    if (opt.pros.length) lines.push("**Pros:**", ...opt.pros.map((p) => `- ${p}`));
    if (opt.cons.length) lines.push("**Cons:**", ...opt.cons.map((c) => `- ${c}`));
    if (opt.eliminationReason) lines.push(`**Eliminated:** ${opt.eliminationReason}`);
    lines.push("");
  }

  lines.push("## Decision", "", adr.decision);
  lines.push("", "## Rationale", "", adr.rationale);

  lines.push("", "## Consequences", "");
  lines.push("**Positive:**", ...adr.consequences.positive.map((p) => `- ${p}`));
  lines.push("**Negative:**", ...adr.consequences.negative.map((n) => `- ${n}`));
  lines.push("**Risks:**", ...adr.consequences.risks.map((r) => `- ${r}`));

  return lines.join("\n");
}

/**
 * Resets the ADR counter. For testing only.
 */
export function resetAdrCounter(): void {
  adrCounter = 0;
}
