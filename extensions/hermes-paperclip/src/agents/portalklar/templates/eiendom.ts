/**
 * Portalklar — Real estate (eiendom) industry template.
 *
 * Adds property-specific KPIs: operating margin, debt-to-equity, yield proxy.
 */

export interface EiendomTemplateConfig {
  revenueDeviationThreshold: number;
  costDeviationThreshold: number;
  trackVacancy: boolean;
}

export const EIENDOM_CONFIG: EiendomTemplateConfig = {
  revenueDeviationThreshold: 10,
  costDeviationThreshold: 10,
  trackVacancy: true,
};

/** Accounts specific to real estate reporting. */
export const EIENDOM_COST_ACCOUNTS: Array<{ range: string; label: string }> = [
  { range: "6000-6099", label: "Avskrivning" },
  { range: "6300-6399", label: "Forsikring" },
  { range: "6400-6499", label: "Leiekostnad" },
  { range: "7800-7899", label: "Vedlikehold og reparasjon" },
  { range: "8000-8099", label: "Rentekostnad" },
  { range: "8100-8199", label: "Annen finanskostnad" },
];

/** KPIs for eiendom template. */
export const EIENDOM_KPIS = ["operatingMargin", "debtToEquity"] as const;
