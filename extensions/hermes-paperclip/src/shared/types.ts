import { z } from "zod";

// --- Confidence Scoring ---

export const Confidence = { H: "H", M: "M", L: "L" } as const;
export type Confidence = (typeof Confidence)[keyof typeof Confidence];

export const ConfidenceResultSchema = z.object({
  score: z.enum(["H", "M", "L"]),
  reasoning: z.string().min(1),
});
export type ConfidenceResult = z.infer<typeof ConfidenceResultSchema>;

// --- Data Quality ---

export const DataQualityStatus = {
  CLEAN: "clean",
  SUSPECT: "suspect",
  DIRTY: "dirty",
  PENDING: "pending",
} as const;
export type DataQualityStatus = (typeof DataQualityStatus)[keyof typeof DataQualityStatus];

export const DataSource = {
  TRIPLETEX: "tripletex",
  BRREG: "brreg",
  PROFF: "proff",
  BANK_CSV: "bank_csv",
  AGENT_OUTPUT: "agent_output",
  NOTION: "notion",
} as const;
export type DataSource = (typeof DataSource)[keyof typeof DataSource];

export const ValidationSeverity = {
  BLOCK: "BLOCK",
  WARN: "WARN",
  INFO: "INFO",
} as const;
export type ValidationSeverity = (typeof ValidationSeverity)[keyof typeof ValidationSeverity];

export interface ValidationIssue {
  layer: 1 | 2 | 3 | 4;
  check: string;
  message: string;
  severity: ValidationSeverity;
  field?: string;
  value?: unknown;
}

export interface ValidationResult {
  recordId: string;
  source: DataSource;
  recordType: string;
  rawData: Record<string, unknown>;
  cleanedData: Record<string, unknown> | null;
  issues: ValidationIssue[];
  confidenceScore: number;
  status: DataQualityStatus;
  autoFixApplied: boolean;
  autoFixDescription: string | null;
}

// --- Agent State ---

export const AgentStatus = {
  ACTIVE: "active",
  IDLE: "idle",
  ERROR: "error",
  STANDBY: "standby",
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const G4Status = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type G4Status = (typeof G4Status)[keyof typeof G4Status];

export const Environment = {
  SANDBOX: "sandbox",
  PRODUCTION: "production",
} as const;
export type Environment = (typeof Environment)[keyof typeof Environment];

// --- Audit Trail ---

export interface AuditEntry {
  agentId: string;
  action: string;
  targetType: string;
  targetId?: string;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  confidence: Confidence;
  rationale: string;
  g4Status: G4Status;
  environment: Environment;
}

// --- Tripletex Types ---

export interface TripletexVoucher {
  date: string;
  description: string;
  postings: TripletexPosting[];
}

export interface TripletexPosting {
  accountId: number;
  amount: number;
  amountCurrency: number;
  description: string;
  vatCode?: number;
  departmentId?: number;
}

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchantName?: string;
  accountNumber?: string;
  reconciled: boolean;
}

// --- Client Profile ---

export interface ClientProfile {
  orgNr: string;
  companyName: string;
  naceCode?: string;
  industryTemplate?: string;
  tripletexCustomerId?: number;
  contactName?: string;
  contactEmail?: string;
  pricingModel?: "fixed" | "hourly" | "mixed";
  monthlyFixedPrice?: number;
  hourlyRate?: number;
  onboardingStatus: string;
  assignedAccountant?: string;
  brregData?: Record<string, unknown>;
  dataQualityStatus: DataQualityStatus;
}

// --- Time Tracking ---

export interface TimeEntry {
  tripletexEntryId?: number;
  employeeId: number;
  employeeName?: string;
  clientOrgNr?: string;
  projectId?: number;
  date: string;
  hours: number;
  hourlyRate?: number;
  billable: boolean;
  description?: string;
  dataQualityStatus: DataQualityStatus;
}

// --- Profitability ---

export interface ClientProfitability {
  clientOrgNr: string;
  clientName: string;
  hoursThisPeriod: number;
  revenueThisPeriod: number;
  effectiveHourlyRate: number;
  employeeCostAllocated: number;
  marginPercentage: number;
  isFixedPrice: boolean;
  deviationFromBudget: number;
  flag: "PROFITABLE" | "MARGINAL" | "UNPROFITABLE";
}

// --- Report ---

export interface MonthlyReport {
  clientOrgNr: string;
  clientName: string;
  periodYear: number;
  periodMonth: number;
  revenue: number;
  revenuePriorYear: number;
  revenueDeltaPct: number;
  costs: Record<string, number>;
  ebitda: number;
  cashPosition: number;
  overdueReceivables: number;
  deviations: ReportDeviation[];
  industryKpis: Record<string, number>;
  confidence: Confidence;
}

export interface ReportDeviation {
  account: string;
  description: string;
  actual: number;
  comparator: number;
  deltaPct: number;
  severity: "high" | "medium" | "low";
}

// --- MVA ---

export const VALID_MVA_RATES = [0, 12, 15, 25] as const;
export type MvaRate = (typeof VALID_MVA_RATES)[number];
