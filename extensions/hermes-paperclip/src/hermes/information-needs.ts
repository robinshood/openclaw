import { z } from "zod";

/**
 * Information Needs Model — Hermes Intelligence Module
 *
 * Solves the "Frogner House problem" (P3): collecting everything
 * without knowing what we actually need for scoring and decisions.
 *
 * Each portfolio company gets an InformationNeedsModel that:
 * 1. Generates required data fields based on NACE industry code
 * 2. Tracks what's been collected vs. what's missing
 * 3. Computes confidence (0-100) that rises with collected data
 * 4. Guides Hermes on what to fetch next
 */

export const DataCategory = {
  FINANCIAL: "financial",
  OPERATIONAL: "operational",
  TECHNICAL: "technical",
  ORGANIZATIONAL: "organizational",
} as const;

export type DataCategory = (typeof DataCategory)[keyof typeof DataCategory];

export const DataPriority = {
  MUST: "must",
  SHOULD: "should",
  NICE: "nice",
} as const;

export type DataPriority = (typeof DataPriority)[keyof typeof DataPriority];

export const CollectionStatus = {
  COLLECTED: "collected",
  MISSING: "missing",
  PARTIAL: "partial",
} as const;

export type CollectionStatus = (typeof CollectionStatus)[keyof typeof CollectionStatus];

export const Phase = {
  DISCOVERY: "discovery",
  MAPPING: "mapping",
  SCORING: "scoring",
  IMPLEMENTATION: "implementation",
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

// --- Schemas ---

export const DataRequirementSchema = z.object({
  category: z.enum(["financial", "operational", "technical", "organizational"]),
  field: z.string(),
  whyNeeded: z.string(),
  source: z.string(),
  priority: z.enum(["must", "should", "nice"]),
  status: z.enum(["collected", "missing", "partial"]),
  value: z.unknown().optional(),
  collectedAt: z.string().datetime().optional(),
});
export type DataRequirement = z.infer<typeof DataRequirementSchema>;

export const InformationNeedsModelSchema = z.object({
  companyOrgNumber: z.string(),
  companyName: z.string(),
  industry: z.string(),
  naceCode: z.string(),
  phase: z.enum(["discovery", "mapping", "scoring", "implementation"]),
  requirements: z.array(DataRequirementSchema),
  confidence: z.number().min(0).max(100),
  lastUpdated: z.string().datetime(),
});
export type InformationNeedsModel = z.infer<typeof InformationNeedsModelSchema>;

// --- NACE-based industry templates ---

/** Common data requirements for all industries */
const BASE_REQUIREMENTS: Omit<DataRequirement, "status">[] = [
  {
    category: "financial",
    field: "annual_revenue",
    whyNeeded: "Revenue per employee benchmark for efficiency scoring",
    source: "Proff / annual report",
    priority: "must",
  },
  {
    category: "financial",
    field: "employee_count",
    whyNeeded: "Revenue per employee ratio",
    source: "BRREG / Proff",
    priority: "must",
  },
  {
    category: "financial",
    field: "operating_margin",
    whyNeeded: "Profitability baseline for ROI calculation",
    source: "Proff / annual report",
    priority: "should",
  },
  {
    category: "technical",
    field: "erp_system",
    whyNeeded: "Integration feasibility (API availability)",
    source: "Interview / website",
    priority: "must",
  },
  {
    category: "technical",
    field: "accounting_system",
    whyNeeded: "Automation integration point",
    source: "Interview",
    priority: "must",
  },
  {
    category: "organizational",
    field: "key_person_risk",
    whyNeeded: "Knowledge loss failure mode (KNOWLEDGE_LOSS)",
    source: "Interview / LinkedIn",
    priority: "should",
  },
  {
    category: "organizational",
    field: "employee_age_distribution",
    whyNeeded: "Retirement risk assessment",
    source: "Interview",
    priority: "should",
  },
];

/** NACE 69.201 — Regnskap (Accounting firms) */
const ACCOUNTING_REQUIREMENTS: Omit<DataRequirement, "status">[] = [
  {
    category: "operational",
    field: "client_count",
    whyNeeded: "Volume scoring for PARS",
    source: "Interview / Tripletex",
    priority: "must",
  },
  {
    category: "operational",
    field: "monthly_voucher_volume",
    whyNeeded: "PARS volume dimension for Bilagsansen",
    source: "Tripletex API",
    priority: "must",
  },
  {
    category: "operational",
    field: "voucher_no_touch_rate",
    whyNeeded: "Current automation level baseline",
    source: "Propell.ai / Tripletex",
    priority: "must",
  },
  {
    category: "financial",
    field: "revenue_per_employee",
    whyNeeded: "Benchmark: 2.0-3.5M NOK normal, 3.5M+ = well-automated",
    source: "Calculated",
    priority: "must",
  },
  {
    category: "financial",
    field: "customer_churn_rate",
    whyNeeded: "Benchmark: <5% healthy, >5% = warning",
    source: "Interview / CRM",
    priority: "should",
  },
  {
    category: "technical",
    field: "tripletex_version",
    whyNeeded: "API compatibility and feature availability",
    source: "Tripletex admin",
    priority: "should",
  },
  {
    category: "technical",
    field: "propell_ai_status",
    whyNeeded: "OOTB coverage check (Bilagsansen overlap)",
    source: "Interview",
    priority: "must",
  },
  {
    category: "technical",
    field: "payroll_system",
    whyNeeded: "Sanna integration feasibility",
    source: "Interview",
    priority: "should",
  },
  {
    category: "operational",
    field: "vat_reporting_frequency",
    whyNeeded: "Compliance scoring for PARS",
    source: "Interview / Altinn",
    priority: "should",
  },
  {
    category: "operational",
    field: "year_end_process_hours",
    whyNeeded: "Time scoring for annual close process",
    source: "Interview",
    priority: "nice",
  },
];

/** NACE 55.101 — Hotell (Hotels) */
const HOSPITALITY_REQUIREMENTS: Omit<DataRequirement, "status">[] = [
  {
    category: "operational",
    field: "room_count",
    whyNeeded: "Volume scaling for operational processes",
    source: "BRREG / website",
    priority: "must",
  },
  {
    category: "operational",
    field: "pms_system",
    whyNeeded: "Property Management System — integration feasibility",
    source: "Interview",
    priority: "must",
  },
  {
    category: "financial",
    field: "revpar",
    whyNeeded: "Revenue per available room — key hospitality KPI",
    source: "PMS / financial reports",
    priority: "must",
  },
  {
    category: "financial",
    field: "occupancy_rate",
    whyNeeded: "Occupancy benchmark (target ≥70%)",
    source: "PMS",
    priority: "must",
  },
  {
    category: "operational",
    field: "ota_commission_rate",
    whyNeeded: "Distribution cost optimization opportunity",
    source: "OTA contracts / interview",
    priority: "should",
  },
  {
    category: "operational",
    field: "housekeeping_model",
    whyNeeded: "Labor cost structure (in-house vs outsourced)",
    source: "Interview",
    priority: "should",
  },
  {
    category: "operational",
    field: "seasonal_peaks",
    whyNeeded: "Demand patterns for staffing automation",
    source: "PMS / interview",
    priority: "should",
  },
  {
    category: "financial",
    field: "guest_satisfaction_score",
    whyNeeded: "Quality KPI (target ≥8.0/10)",
    source: "Review platforms / PMS",
    priority: "nice",
  },
];

/** NACE 68.* — Eiendom (Real estate) */
const REAL_ESTATE_REQUIREMENTS: Omit<DataRequirement, "status">[] = [
  {
    category: "operational",
    field: "property_count",
    whyNeeded: "Portfolio size for process volume estimation",
    source: "Matrikkel / interview",
    priority: "must",
  },
  {
    category: "operational",
    field: "tenant_count",
    whyNeeded: "Invoice and accounting volume driver",
    source: "ERP / interview",
    priority: "must",
  },
  {
    category: "financial",
    field: "net_yield",
    whyNeeded: "Key real estate profitability KPI",
    source: "Financial reports",
    priority: "must",
  },
  {
    category: "technical",
    field: "property_management_system",
    whyNeeded: "Integration feasibility for lease/invoice automation",
    source: "Interview",
    priority: "must",
  },
  {
    category: "operational",
    field: "lease_contract_count",
    whyNeeded: "Volume for contract management automation",
    source: "ERP",
    priority: "should",
  },
  {
    category: "financial",
    field: "vacancy_rate",
    whyNeeded: "Operational efficiency indicator",
    source: "Property management system",
    priority: "should",
  },
];

/** Map NACE code prefixes to industry-specific requirements */
const NACE_TEMPLATE_MAP: Record<string, Omit<DataRequirement, "status">[]> = {
  "69.20": ACCOUNTING_REQUIREMENTS,
  "55.10": HOSPITALITY_REQUIREMENTS,
  "68.": REAL_ESTATE_REQUIREMENTS,
};

/**
 * Get industry-specific requirements based on NACE code.
 * Falls back to base requirements only if no match found.
 */
function getIndustryRequirements(naceCode: string): Omit<DataRequirement, "status">[] {
  for (const [prefix, reqs] of Object.entries(NACE_TEMPLATE_MAP)) {
    if (naceCode.startsWith(prefix)) {
      return reqs;
    }
  }
  return [];
}

/**
 * Create a new InformationNeedsModel for a company.
 * Generates requirements based on NACE code (base + industry-specific).
 */
export function createInformationNeeds(params: {
  companyOrgNumber: string;
  companyName: string;
  industry: string;
  naceCode: string;
}): InformationNeedsModel {
  const industryReqs = getIndustryRequirements(params.naceCode);
  const allReqs = [...BASE_REQUIREMENTS, ...industryReqs];

  const requirements: DataRequirement[] = allReqs.map((req) => ({
    ...req,
    status: CollectionStatus.MISSING,
  }));

  return {
    companyOrgNumber: params.companyOrgNumber,
    companyName: params.companyName,
    industry: params.industry,
    naceCode: params.naceCode,
    phase: Phase.DISCOVERY,
    requirements,
    confidence: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update a data requirement with a collected value.
 */
export function collectDataPoint(
  model: InformationNeedsModel,
  field: string,
  value: unknown,
  partial = false,
): InformationNeedsModel {
  const updatedReqs = model.requirements.map((req) => {
    if (req.field !== field) return req;
    return {
      ...req,
      status: partial ? CollectionStatus.PARTIAL : CollectionStatus.COLLECTED,
      value,
      collectedAt: new Date().toISOString(),
    } satisfies DataRequirement;
  });

  const confidence = calculateConfidence(updatedReqs);

  return {
    ...model,
    requirements: updatedReqs,
    confidence,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate confidence score (0-100) based on collection completeness.
 * Must-have fields count 3x, should-have 2x, nice-to-have 1x.
 */
export function calculateConfidence(requirements: DataRequirement[]): number {
  if (requirements.length === 0) return 0;

  const priorityWeight = { must: 3, should: 2, nice: 1 };
  const statusScore = { collected: 1, partial: 0.5, missing: 0 };

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const req of requirements) {
    const weight = priorityWeight[req.priority];
    totalWeight += weight;
    earnedWeight += weight * statusScore[req.status];
  }

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}

/**
 * Get the next data points to collect, prioritized by importance.
 * Returns missing/partial requirements sorted by priority.
 */
export function getNextDataNeeds(model: InformationNeedsModel): DataRequirement[] {
  const priorityOrder = { must: 0, should: 1, nice: 2 };

  return model.requirements
    .filter((req) => req.status !== CollectionStatus.COLLECTED)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Determine if we have enough data to proceed to the next phase.
 * - Discovery → Mapping: all "must" fields collected
 * - Mapping → Scoring: confidence ≥ 70%
 * - Scoring → Implementation: confidence ≥ 85%
 */
export function canAdvancePhase(model: InformationNeedsModel): boolean {
  switch (model.phase) {
    case Phase.DISCOVERY: {
      const mustFields = model.requirements.filter((r) => r.priority === "must");
      return mustFields.every((r) => r.status === "collected");
    }
    case Phase.MAPPING:
      return model.confidence >= 70;
    case Phase.SCORING:
      return model.confidence >= 85;
    case Phase.IMPLEMENTATION:
      return true; // Already at final phase
    default:
      return false;
  }
}

/**
 * Advance the model to the next phase if criteria are met.
 * Returns the model unchanged if criteria aren't met.
 */
export function advancePhase(model: InformationNeedsModel): InformationNeedsModel {
  if (!canAdvancePhase(model)) return model;

  const phaseOrder: Phase[] = [Phase.DISCOVERY, Phase.MAPPING, Phase.SCORING, Phase.IMPLEMENTATION];
  const currentIndex = phaseOrder.indexOf(model.phase);
  if (currentIndex >= phaseOrder.length - 1) return model;

  return {
    ...model,
    phase: phaseOrder[currentIndex + 1],
    lastUpdated: new Date().toISOString(),
  };
}
