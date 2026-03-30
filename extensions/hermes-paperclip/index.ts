/**
 * Hermes × Paperclip — PE Portfolio Agent System
 *
 * Two autonomous agents for Ett Capital's portfolio company operations:
 * - Hermes: Intelligence, monitoring, and operations
 * - Paperclip: Integration and gap-filling
 * - Mission Control: Dashboard and reporting
 *
 * All agents share the Decision Engine (First Principles, Inversion, Decision Matrix)
 * and communicate via Notion as single source of truth.
 */

// Re-export core modules for external use
export { decompose, isSafeToDecide } from "./src/shared/principles/first-principles.ts";
export {
  generateFailureModes,
  evaluateOption,
  evaluateAllOptions,
  applyHumanOverride,
} from "./src/shared/principles/inversion.ts";
export {
  scoreOption,
  evaluateOptions,
  buildCriteria,
  fullDecisionPipeline,
  getWeights,
} from "./src/shared/principles/decision-matrix.ts";
export { createAdrFromPipeline, formatAdrMarkdown } from "./src/shared/principles/adr.ts";

// Types
export type {
  Truth,
  Assumption,
  FailureModeCheck,
  DecisionCriterion,
  DecisionResult,
  DecompositionResult,
  InversionResult,
  DecisionMatrixResult,
  PipelineResult,
  InversionContext,
} from "./src/shared/principles/types.ts";
export {
  FailureMode,
  Severity,
  Recommendation,
  DecisionType,
} from "./src/shared/principles/types.ts";

// Models
export type { Company } from "./src/shared/models/company.ts";
export type { Process } from "./src/shared/models/process.ts";
export type { Gap, GapReport } from "./src/shared/models/gap.ts";
export type { Sprint, SprintPlan } from "./src/shared/models/sprint.ts";
export type { Service, ServiceCatalog } from "./src/shared/models/service.ts";
export type { TechReviewCheckResult, TechReviewReport } from "./src/shared/models/tech-review.ts";
export { computeComplianceScore, countByFailureMode } from "./src/shared/models/tech-review.ts";

// Notion
export { NotionClient, createMockTransport } from "./src/shared/notion/client.ts";

// Mission Control
export { buildDashboard } from "./src/mission-control/dashboard.ts";
export type { DashboardState } from "./src/mission-control/types.ts";

// Paperclip Orchestration (following github.com/robinshood/paperclip patterns)
export {
  createDefaultOrgChart,
  createDefaultGoals,
  evaluateBudgetStatus,
  isAgentBlocked,
} from "./src/paperclip/orchestration.ts";
export type {
  Agent,
  OrgChart,
  Goal,
  CostEvent,
  HeartbeatRun,
} from "./src/paperclip/orchestration.ts";

// Sandbox
export { runScenario } from "./sandbox/simulator.ts";
export { createSystemregnskapScenario } from "./sandbox/scenarios/systemregnskap.ts";

// --- ettOS v2 modules ---

// Environment & Sandbox Guard
export { loadEttosConfig, isSandbox, isProduction, EttosEnv } from "./src/shared/config/env.ts";
export type { EttosConfig } from "./src/shared/config/env.ts";
export { createSandboxGuard, SandboxGuardError } from "./src/shared/config/sandbox-guard.ts";
export type {
  SandboxGuard,
  WriteOperation,
  HumanApprovalFn,
} from "./src/shared/config/sandbox-guard.ts";

// Tripletex API Client
export {
  TripletexClient,
  TripletexClientError,
  createFetchTransport,
} from "./src/shared/tripletex-client.ts";
export type {
  Voucher,
  VoucherLine,
  Customer,
  TimesheetEntry,
  HttpTransport,
} from "./src/shared/tripletex-client.ts";
export { TripletexClient as TripletexAPI } from "./src/shared/tripletex-client.ts";

// BRREG Client
export {
  BrregClient,
  BrregClientError,
  createBrregFetchTransport,
} from "./src/shared/brreg-client.ts";
export type {
  BrregEnhet,
  Nace,
  Adresse,
  BrregSearchResult,
  BrregHttpTransport,
} from "./src/shared/brreg-client.ts";

// PARS Scoring Engine (8-dimensional)
export {
  calculateParsScore,
  classifyTier,
  buildParsResult,
  normalizeVolume,
  normalizeTime,
  normalizeErrorRate,
  DEFAULT_PARS_WEIGHTS,
  ParsDimension,
  ParsTier,
} from "./src/shared/scoring/pars.ts";
export type { ParsResult, ParsWeights, DimensionScore } from "./src/shared/scoring/pars.ts";

// WSJF Prioritization
export {
  calculateWsjf,
  calculateCostOfDelay,
  rankByWsjf,
  quickWsjf,
} from "./src/shared/scoring/wsjf.ts";
export type { WsjfItem, CostOfDelay } from "./src/shared/scoring/wsjf.ts";

// Hermes Intelligence — Information Needs
export {
  createInformationNeeds,
  collectDataPoint,
  calculateConfidence,
  getNextDataNeeds,
  canAdvancePhase,
  advancePhase,
  DataCategory,
  DataPriority,
  CollectionStatus,
  Phase,
} from "./src/hermes/information-needs.ts";
export type { InformationNeedsModel, DataRequirement } from "./src/hermes/information-needs.ts";

// Bridge — Flow → Runtime
export {
  parseAgentDocset,
  parseIdentityBlock,
  parseInstructionBlock,
  parseModesPolicyBlock,
  parseNorthStarBlock,
  parseProtocolBlock,
  AgentPackage,
  AgentDocsetStatus,
  FlowMode,
} from "./src/bridge/docset-parser.ts";
export type {
  AgentDocset,
  IdentityBlock,
  InstructionBlock,
  ModesPolicy,
  NorthStar,
  Protocol,
} from "./src/bridge/docset-parser.ts";

export {
  mapFlowToRuntime,
  mapModesPolicy,
  isTransitionAllowed,
  RuntimeMode,
} from "./src/bridge/mode-mapper.ts";
export type { RuntimeModeConfig } from "./src/bridge/mode-mapper.ts";

export {
  syncAgentStatus,
  syncSandboxResults,
  registerInRoster,
  passesQaGate,
} from "./src/bridge/sync-back.ts";
export type { AgentRuntimeStatus } from "./src/bridge/sync-back.ts";
