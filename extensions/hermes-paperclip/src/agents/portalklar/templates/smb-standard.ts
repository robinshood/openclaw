/**
 * Portalklar — SMB Standard template.
 *
 * Default report template for small/medium businesses.
 * Focuses on revenue growth, margin, cash position, and receivables.
 */

export interface SmbTemplateConfig {
  /** Revenue deviation threshold (%) before flagging */
  revenueDeviationThreshold: number;
  /** Cost deviation threshold (%) before flagging */
  costDeviationThreshold: number;
  /** Include cash flow analysis */
  includeCashFlow: boolean;
  /** Include receivables aging */
  includeReceivablesAging: boolean;
}

export const SMB_STANDARD_CONFIG: SmbTemplateConfig = {
  revenueDeviationThreshold: 10,
  costDeviationThreshold: 15,
  includeCashFlow: true,
  includeReceivablesAging: true,
};

/** Accounts to include in cost breakdown for SMB reports. */
export const SMB_COST_ACCOUNTS: Array<{ range: string; label: string }> = [
  { range: "4000-4999", label: "Varekostnad" },
  { range: "5000-5999", label: "Lønnskostnad" },
  { range: "6000-6999", label: "Avskrivning og nedskrivning" },
  { range: "7000-7999", label: "Andre driftskostnader" },
  { range: "8000-8999", label: "Finanskostnader" },
];

/** KPIs to calculate for SMB template. */
export const SMB_KPIS = ["grossMargin", "operatingMargin", "currentRatio"] as const;
