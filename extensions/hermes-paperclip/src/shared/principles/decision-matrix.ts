import { decompose, isSafeToDecide } from "./first-principles.ts";
import { evaluateAllOptions } from "./inversion.ts";
import {
  PROCESS_CRITERIA_WEIGHTS,
  Recommendation,
  STRATEGIC_CRITERIA_WEIGHTS,
  type Assumption,
  type DecisionCriterion,
  type DecisionMatrixResult,
  type DecisionResult,
  type DecisionType,
  type InversionContext,
  type PipelineResult,
  type Truth,
} from "./types.ts";

const RECOMMEND_THRESHOLD = 3.6;
const TIE_MARGIN = 0.15;
const LEAD_MARGIN = 0.2;

/**
 * Returns the predefined weight map for a decision type.
 */
export function getWeights(type: DecisionType): Record<string, number> {
  return type === "process" ? PROCESS_CRITERIA_WEIGHTS : STRATEGIC_CRITERIA_WEIGHTS;
}

/**
 * Validates that criterion weights sum to 1.0 (within floating point tolerance).
 */
export function validateWeights(criteria: DecisionCriterion[]): boolean {
  const sum = criteria.reduce((acc, c) => acc + c.weight, 0);
  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Scores a single option by computing the weighted sum of its criteria.
 */
export function scoreOption(criteria: DecisionCriterion[]): number {
  if (!validateWeights(criteria)) {
    throw new Error(
      `Criterion weights must sum to 1.0, got ${criteria.reduce((a, c) => a + c.weight, 0).toFixed(3)}`,
    );
  }
  return criteria.reduce((sum, c) => sum + c.weight * c.score, 0);
}

/**
 * Evaluates multiple options and produces a recommendation.
 *
 * Rules:
 * - Score >= 3.6 with >= 0.2 lead over second place → RECOMMEND
 * - Top-2 within 0.15 → TIE (run experiment to break it)
 * - No option above 3.6 → ESCALATE to human
 */
export function evaluateOptions(
  options: Array<{ name: string; criteria: DecisionCriterion[] }>,
): DecisionMatrixResult {
  if (options.length === 0) {
    return {
      results: [],
      recommended: null,
      isTie: false,
      requiresEscalation: true,
      reasoning: "No options provided for evaluation",
    };
  }

  // Score each option
  const results: DecisionResult[] = options.map((opt) => ({
    option: opt.name,
    totalScore: scoreOption(opt.criteria),
    criteria: opt.criteria,
    recommendation: Recommendation.ESCALATE, // placeholder, set below
  }));

  // Sort descending by score
  results.sort((a, b) => b.totalScore - a.totalScore);

  const top = results[0];
  const second = results.length > 1 ? results[1] : null;

  // Apply recommendation rules
  const anyAboveThreshold = top.totalScore >= RECOMMEND_THRESHOLD;
  const hasLead = second === null || top.totalScore - second.totalScore >= LEAD_MARGIN;
  const isTie = second !== null && Math.abs(top.totalScore - second.totalScore) <= TIE_MARGIN;

  let recommended: string | null = null;
  let requiresEscalation = false;
  let reasoning: string;

  if (!anyAboveThreshold) {
    requiresEscalation = true;
    reasoning = `No option scored above threshold (${RECOMMEND_THRESHOLD}). Top score: ${top.totalScore.toFixed(2)}. Escalate to human decision-maker.`;
    for (const r of results) r.recommendation = Recommendation.ESCALATE;
  } else if (isTie && second) {
    reasoning = `Top two options within ${TIE_MARGIN} margin: "${top.option}" (${top.totalScore.toFixed(2)}) vs "${second.option}" (${second.totalScore.toFixed(2)}). Run experiment to break tie.`;
    top.recommendation = Recommendation.TIE;
    second.recommendation = Recommendation.TIE;
    for (const r of results.slice(2)) r.recommendation = Recommendation.ESCALATE;
  } else if (hasLead) {
    recommended = top.option;
    reasoning = `"${top.option}" scores ${top.totalScore.toFixed(2)} with sufficient lead. Recommended.`;
    top.recommendation = Recommendation.RECOMMEND;
    for (const r of results.slice(1)) r.recommendation = Recommendation.ESCALATE;
  } else {
    // Above threshold but lead insufficient — still recommend the top
    recommended = top.option;
    reasoning = `"${top.option}" scores ${top.totalScore.toFixed(2)} above threshold. Lead over second (${second?.totalScore.toFixed(2)}) is marginal but sufficient.`;
    top.recommendation = Recommendation.RECOMMEND;
    for (const r of results.slice(1)) r.recommendation = Recommendation.ESCALATE;
  }

  return {
    results,
    recommended,
    isTie,
    requiresEscalation,
    reasoning,
  };
}

/**
 * Constructs criteria from a weight map and score map.
 * Useful when building criteria from predefined weight templates.
 */
export function buildCriteria(
  weights: Record<string, number>,
  scores: Record<string, number>,
): DecisionCriterion[] {
  return Object.entries(weights).map(([name, weight]) => {
    const score = scores[name];
    if (score === undefined) {
      throw new Error(`Missing score for criterion: ${name}`);
    }
    if (score < 1 || score > 5) {
      throw new Error(`Score for "${name}" must be 1-5, got ${score}`);
    }
    return { name, weight, score };
  });
}

/**
 * Full decision pipeline: decompose → invert → score surviving options.
 *
 * This is the MANDATORY sequence. No decision should skip any step.
 * 1. First Principles: decompose the problem into truths and assumptions
 * 2. Inversion: check all options against failure modes, eliminate bad ones
 * 3. Decision Matrix: score surviving options with weighted criteria
 */
export function fullDecisionPipeline(params: {
  problem: string;
  truths: Truth[];
  assumptions: Assumption[];
  options: Array<{ name: string; criteria: DecisionCriterion[] }>;
  inversionContext: InversionContext;
}): PipelineResult {
  // Step 1: First Principles decomposition
  const decomposition = decompose(params.problem, params.truths, params.assumptions);

  // Step 2: Inversion — evaluate all options against failure modes
  const inversions = evaluateAllOptions(params.inversionContext);

  // Step 3: Filter out eliminated options
  const eliminatedNames = new Set(inversions.filter((i) => i.eliminated).map((i) => i.option));
  const survivingOptions = params.options.filter((o) => !eliminatedNames.has(o.name));
  const survivingNames = survivingOptions.map((o) => o.name);

  // Step 4: Decision Matrix on surviving options (only if safe to decide)
  let matrix: DecisionMatrixResult | null = null;
  if (survivingOptions.length > 0 && isSafeToDecide(decomposition)) {
    matrix = evaluateOptions(survivingOptions);
  } else if (survivingOptions.length > 0) {
    matrix = {
      results: [],
      recommended: null,
      isTie: false,
      requiresEscalation: true,
      reasoning: "Decomposition has unverified truths or low-confidence assumptions. Escalating.",
    };
  }

  return {
    decomposition,
    inversions,
    matrix,
    survivingOptions: survivingNames,
    timestamp: new Date().toISOString(),
  };
}
