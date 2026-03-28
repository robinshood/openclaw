/**
 * Payment types for Visa Intelligent Commerce integration.
 *
 * Maps to existing Hermes/Paperclip budget tracking:
 * - BudgetStatus OK → agent can request payments
 * - BudgetStatus WARNING → human approval required
 * - BudgetStatus SOFT_STOP → only pre-approved payments
 * - BudgetStatus HARD_STOP → all payments blocked
 */

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type BudgetStatus = "ok" | "warning" | "soft-stop" | "hard-stop";
export type WalletConnectionStatus = "connected" | "disconnected" | "sandbox";

export interface SpendingLimit {
  maxPerTransactionCents: number;
  maxPerMonthCents: number;
  allowedCategories: string[];
  requiresApprovalAboveCents: number;
}

export interface PaymentRequest {
  id: string;
  agentId: string;
  agentName: string;
  companyId: string;
  companyName: string;
  amountCents: number;
  currency: string;
  description: string;
  category: string;
  status: ApprovalStatus;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  companyName: string;
  orgNumber: string;
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  currency: string;
  status: ApprovalStatus;
  generatedAt: string;
  approvedBy?: string;
  paidAt?: string;
  analysisDetails: {
    processesMapped: number;
    gapsIdentified: number;
    gapsClosed: number;
    sprintPhase: string;
    totalHoursSaved: number;
  };
}

export interface WalletState {
  connectionStatus: WalletConnectionStatus;
  budgetStatus: BudgetStatus;
  spendingLimits: SpendingLimit;
  spentThisMonthCents: number;
  budgetMonthlyCents: number;
  pendingApprovals: PaymentRequest[];
  recentTransactions: PaymentRequest[];
}

// --- Mock Data ---

export const MOCK_WALLET_STATE: WalletState = {
  connectionStatus: "sandbox",
  budgetStatus: "ok",
  spendingLimits: {
    maxPerTransactionCents: 50000, // $500
    maxPerMonthCents: 500000, // $5,000
    allowedCategories: ["analysis", "integration", "monitoring", "reporting"],
    requiresApprovalAboveCents: 10000, // $100
  },
  spentThisMonthCents: 12450,
  budgetMonthlyCents: 50000,
  pendingApprovals: [
    {
      id: "pay-001",
      agentId: "hermes-912345678",
      agentName: "Hermes",
      companyId: "912345678",
      companyName: "Systemregnskap AS",
      amountCents: 8500,
      currency: "NOK",
      description: "Company intelligence profiling — BRREG + web research",
      category: "analysis",
      status: "pending",
      createdAt: "2026-03-28T10:00:00Z",
    },
    {
      id: "pay-002",
      agentId: "paperclip-912345678",
      agentName: "Paperclip",
      companyId: "912345678",
      companyName: "Systemregnskap AS",
      amountCents: 15000,
      currency: "NOK",
      description: "Gap analysis + Sprint 1 planning — 12 processes evaluated",
      category: "integration",
      status: "pending",
      createdAt: "2026-03-28T11:30:00Z",
    },
  ],
  recentTransactions: [
    {
      id: "pay-000",
      agentId: "hermes-912345678",
      agentName: "Hermes",
      companyId: "912345678",
      companyName: "Systemregnskap AS",
      amountCents: 4200,
      currency: "NOK",
      description: "Initial BRREG data pull + board member analysis",
      category: "analysis",
      status: "approved",
      createdAt: "2026-03-27T14:00:00Z",
      approvedBy: "Robin Frantzen",
      approvedAt: "2026-03-27T14:05:00Z",
    },
  ],
};

export const MOCK_INVOICE: Invoice = {
  id: "INV-2026-001",
  companyId: "912345678",
  companyName: "Systemregnskap AS",
  orgNumber: "912 345 678",
  lineItems: [
    {
      description: "Company Intelligence Profile (Hermes)",
      quantity: 1,
      unitPriceCents: 8500,
      totalCents: 8500,
    },
    {
      description: "Infrastructure & System Mapping",
      quantity: 1,
      unitPriceCents: 4200,
      totalCents: 4200,
    },
    {
      description: "Process Analysis — 12 processes scored",
      quantity: 12,
      unitPriceCents: 850,
      totalCents: 10200,
    },
    {
      description: "Gap Analysis (Paperclip) vs OOTB coverage",
      quantity: 1,
      unitPriceCents: 15000,
      totalCents: 15000,
    },
    {
      description: "Sprint Plan Generation (4 sprints)",
      quantity: 4,
      unitPriceCents: 2500,
      totalCents: 10000,
    },
  ],
  subtotalCents: 47900,
  vatCents: 11975,
  totalCents: 59875,
  currency: "NOK",
  status: "pending",
  generatedAt: "2026-03-28T12:00:00Z",
  analysisDetails: {
    processesMapped: 12,
    gapsIdentified: 8,
    gapsClosed: 0,
    sprintPhase: "WORKSHOP",
    totalHoursSaved: 0,
  },
};
