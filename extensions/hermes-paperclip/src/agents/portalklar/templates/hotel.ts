/**
 * Portalklar — Hotel / hospitality industry template.
 *
 * Adds hotel-specific KPIs: RevPAR proxy, cost ratio, seasonality tracking.
 */

export interface HotelTemplateConfig {
  revenueDeviationThreshold: number;
  costDeviationThreshold: number;
  trackSeasonality: boolean;
}

export const HOTEL_CONFIG: HotelTemplateConfig = {
  revenueDeviationThreshold: 15,
  costDeviationThreshold: 20,
  trackSeasonality: true,
};

/** Accounts specific to hotel reporting. */
export const HOTEL_COST_ACCOUNTS: Array<{ range: string; label: string }> = [
  { range: "4000-4999", label: "Varekostnad (mat/drikke)" },
  { range: "5000-5999", label: "Lønnskostnad" },
  { range: "6300-6399", label: "Forsikring" },
  { range: "6400-6499", label: "Leiekostnad" },
  { range: "7000-7199", label: "Reise og representasjon" },
  { range: "7800-7899", label: "Vedlikehold" },
];

/** KPIs for hotel template. */
export const HOTEL_KPIS = ["revenuePerEmployee", "costRatio", "operatingMargin"] as const;
