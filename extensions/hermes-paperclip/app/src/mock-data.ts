/**
 * Mock data for the dashboard — mirrors real agent output shapes.
 */

export interface AgentStatus {
  id: string;
  name: string;
  parent: "hermes" | "paperclip";
  priority: number;
  status: "active" | "idle" | "error" | "standby";
  lastRun?: string;
  lastResult?: string;
}

export interface DataQualityMetric {
  date: string;
  source: string;
  total: number;
  clean: number;
  suspect: number;
  dirty: number;
}

export interface AuditEntry {
  id: number;
  agentId: string;
  action: string;
  targetType: string;
  confidence: "H" | "M" | "L";
  g4Status: "approved" | "pending" | "rejected";
  rationale: string;
  createdAt: string;
}

export interface VoucherQueueItem {
  id: string;
  merchant: string;
  amount: number;
  account: number;
  accountName: string;
  mvaRate: number;
  confidence: "GREEN" | "YELLOW" | "RED";
  date: string;
}

export interface ClientOverview {
  orgNr: string;
  name: string;
  template: string;
  onboardingStatus: string;
  profitability: "PROFITABLE" | "MARGINAL" | "UNPROFITABLE";
  hoursThisPeriod: number;
  revenue: number;
  margin: number;
}

export const mockAgents: AgentStatus[] = [
  {
    id: "paperclip-wash-01",
    name: "Renvasken",
    parent: "paperclip",
    priority: 4.8,
    status: "active",
    lastRun: "2026-03-28T09:15:00Z",
    lastResult: "247 records validated — 95.5% clean",
  },
  {
    id: "hermes-bilag-01",
    name: "Bilagsansen",
    parent: "hermes",
    priority: 4.1,
    status: "idle",
    lastRun: "2026-03-28T08:30:00Z",
    lastResult: "12 vouchers posted, 3 pending review",
  },
  {
    id: "hermes-rapport-01",
    name: "Portalklar",
    parent: "hermes",
    priority: 3.7,
    status: "idle",
    lastRun: "2026-03-05T06:00:00Z",
    lastResult: "8 monthly reports generated",
  },
  {
    id: "paperclip-onboard-01",
    name: "Velkomst",
    parent: "paperclip",
    priority: 3.6,
    status: "standby",
    lastRun: "2026-03-20T14:22:00Z",
    lastResult: "Bergen Eiendom AS onboarded",
  },
  {
    id: "paperclip-tid-01",
    name: "Tidsvokter",
    parent: "paperclip",
    priority: 3.5,
    status: "active",
    lastRun: "2026-03-28T06:00:00Z",
    lastResult: "156 entries synced, 2 clients flagged unprofitable",
  },
];

export const mockDataQuality: DataQualityMetric[] = [
  { date: "2026-03-22", source: "tripletex", total: 180, clean: 170, suspect: 8, dirty: 2 },
  { date: "2026-03-23", source: "tripletex", total: 195, clean: 184, suspect: 9, dirty: 2 },
  { date: "2026-03-24", source: "tripletex", total: 210, clean: 200, suspect: 7, dirty: 3 },
  { date: "2026-03-25", source: "tripletex", total: 225, clean: 218, suspect: 5, dirty: 2 },
  { date: "2026-03-26", source: "tripletex", total: 198, clean: 190, suspect: 6, dirty: 2 },
  { date: "2026-03-27", source: "tripletex", total: 240, clean: 230, suspect: 8, dirty: 2 },
  { date: "2026-03-28", source: "tripletex", total: 247, clean: 236, suspect: 9, dirty: 2 },
];

export const mockAuditTrail: AuditEntry[] = [
  {
    id: 1,
    agentId: "hermes-bilag-01",
    action: "voucher_posted",
    targetType: "voucher",
    confidence: "H",
    g4Status: "approved",
    rationale: "SAS Eurobonus → konto 7140 (Reisekostnad, MVA 0%)",
    createdAt: "2026-03-28T08:32:15Z",
  },
  {
    id: 2,
    agentId: "hermes-bilag-01",
    action: "voucher_flagged_review",
    targetType: "voucher",
    confidence: "M",
    g4Status: "pending",
    rationale: "YELLOW — Unknown Merchant XYZ → konto 7700",
    createdAt: "2026-03-28T08:32:18Z",
  },
  {
    id: 3,
    agentId: "paperclip-wash-01",
    action: "validate_batch",
    targetType: "transaction",
    confidence: "H",
    g4Status: "approved",
    rationale: "Batch validation: 95.5% clean (247 records)",
    createdAt: "2026-03-28T09:15:02Z",
  },
  {
    id: 4,
    agentId: "paperclip-tid-01",
    action: "unprofitable_clients_flagged",
    targetType: "profitability",
    confidence: "M",
    g4Status: "approved",
    rationale: "2 unprofitable clients flagged for review",
    createdAt: "2026-03-28T06:05:00Z",
  },
  {
    id: 5,
    agentId: "paperclip-onboard-01",
    action: "onboarding_complete",
    targetType: "client",
    confidence: "H",
    g4Status: "approved",
    rationale: "Bergen Eiendom AS — eiendom template, 5/7 steps done",
    createdAt: "2026-03-20T14:22:45Z",
  },
  {
    id: 6,
    agentId: "hermes-rapport-01",
    action: "report_generation_complete",
    targetType: "monthly_report",
    confidence: "H",
    g4Status: "approved",
    rationale: "Test Bedrift AS February 2026 (H confidence)",
    createdAt: "2026-03-05T06:12:30Z",
  },
];

export const mockVoucherQueue: VoucherQueueItem[] = [
  {
    id: "tx-001",
    merchant: "SAS Eurobonus",
    amount: 1250,
    account: 7140,
    accountName: "Reisekostnad",
    mvaRate: 0,
    confidence: "GREEN",
    date: "2026-03-15",
  },
  {
    id: "tx-002",
    merchant: "Uber Trip",
    amount: 450,
    account: 7140,
    accountName: "Reisekostnad",
    mvaRate: 25,
    confidence: "GREEN",
    date: "2026-03-16",
  },
  {
    id: "tx-003",
    merchant: "Scandic Hotels",
    amount: 2800,
    account: 7140,
    accountName: "Reisekostnad",
    mvaRate: 12,
    confidence: "GREEN",
    date: "2026-03-17",
  },
  {
    id: "tx-004",
    merchant: "Restaurant Lofoten",
    amount: 890,
    account: 7100,
    accountName: "Representasjon",
    mvaRate: 25,
    confidence: "GREEN",
    date: "2026-03-18",
  },
  {
    id: "tx-005",
    merchant: "Unknown Corp",
    amount: 3500,
    account: 7700,
    accountName: "Annen kostnad",
    mvaRate: 25,
    confidence: "YELLOW",
    date: "2026-03-19",
  },
  {
    id: "tx-006",
    merchant: "Ambiguous LLC",
    amount: 12000,
    account: 7700,
    accountName: "Annen kostnad",
    mvaRate: 25,
    confidence: "RED",
    date: "2026-03-20",
  },
];

export const mockClients: ClientOverview[] = [
  {
    orgNr: "123456789",
    name: "Test Bedrift AS",
    template: "smb-standard",
    onboardingStatus: "complete",
    profitability: "PROFITABLE",
    hoursThisPeriod: 12.5,
    revenue: 15000,
    margin: 42,
  },
  {
    orgNr: "987654321",
    name: "Bergen Eiendom AS",
    template: "eiendom",
    onboardingStatus: "in_progress",
    profitability: "MARGINAL",
    hoursThisPeriod: 18,
    revenue: 22000,
    margin: 15,
  },
  {
    orgNr: "555444333",
    name: "Oslo Hotel Group AS",
    template: "hotel",
    onboardingStatus: "complete",
    profitability: "PROFITABLE",
    hoursThisPeriod: 8,
    revenue: 25000,
    margin: 55,
  },
  {
    orgNr: "111222333",
    name: "Nordfjord Regnskap AS",
    template: "smb-standard",
    onboardingStatus: "complete",
    profitability: "UNPROFITABLE",
    hoursThisPeriod: 25,
    revenue: 10000,
    margin: -8,
  },
];
