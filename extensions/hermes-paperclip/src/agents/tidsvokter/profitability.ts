/**
 * Tidsvokter — Client profitability calculator.
 *
 * Calculates per-client profitability from time entries.
 * Flags unprofitable clients for accountant review.
 */

import type {
  ClientProfitability,
  ClientProfile,
  Confidence,
  TimeEntry,
} from "../../shared/types.ts";

/**
 * Calculate profitability for a single client.
 */
export function calculateClientProfitability(
  profile: ClientProfile,
  entries: TimeEntry[],
  employeeCostRate: number,
): ClientProfitability {
  const clientEntries = entries.filter((e) => e.clientOrgNr === profile.orgNr);
  const billableEntries = clientEntries.filter((e) => e.billable);

  const totalHours = clientEntries.reduce((sum, e) => sum + e.hours, 0);
  const billableHours = billableEntries.reduce((sum, e) => sum + e.hours, 0);

  // Revenue calculation
  let revenue: number;
  if (profile.pricingModel === "fixed") {
    revenue = profile.monthlyFixedPrice ?? 0;
  } else if (profile.pricingModel === "hourly") {
    revenue = billableHours * (profile.hourlyRate ?? 0);
  } else {
    // Mixed: fixed base + hourly overage
    const baseRevenue = profile.monthlyFixedPrice ?? 0;
    const budgetedHours =
      profile.hourlyRate && profile.monthlyFixedPrice
        ? profile.monthlyFixedPrice / profile.hourlyRate
        : 0;
    const overageHours = Math.max(0, billableHours - budgetedHours);
    revenue = baseRevenue + overageHours * (profile.hourlyRate ?? 0);
  }

  const employeeCost = totalHours * employeeCostRate;
  const effectiveRate = totalHours > 0 ? Math.round(revenue / totalHours) : 0;
  const margin = revenue > 0 ? Math.round(((revenue - employeeCost) / revenue) * 1000) / 10 : 0;

  // Budget deviation
  const budgetedRevenue = profile.monthlyFixedPrice ?? revenue;
  const deviation =
    budgetedRevenue > 0
      ? Math.round(((revenue - budgetedRevenue) / budgetedRevenue) * 1000) / 10
      : 0;

  const flag: ClientProfitability["flag"] =
    margin >= 30 ? "PROFITABLE" : margin >= 10 ? "MARGINAL" : "UNPROFITABLE";

  return {
    clientOrgNr: profile.orgNr,
    clientName: profile.companyName,
    hoursThisPeriod: totalHours,
    revenueThisPeriod: revenue,
    effectiveHourlyRate: effectiveRate,
    employeeCostAllocated: employeeCost,
    marginPercentage: margin,
    isFixedPrice: profile.pricingModel === "fixed",
    deviationFromBudget: deviation,
    flag,
  };
}

/**
 * Calculate profitability for all clients.
 */
export function calculateBatchProfitability(
  profiles: ClientProfile[],
  entries: TimeEntry[],
  employeeCostRate: number,
): ClientProfitability[] {
  return profiles.map((p) => calculateClientProfitability(p, entries, employeeCostRate));
}

/**
 * Get the confidence level for profitability calculation.
 */
export function profitabilityConfidence(entries: TimeEntry[], profile: ClientProfile): Confidence {
  const hasRate = profile.hourlyRate !== undefined || profile.monthlyFixedPrice !== undefined;
  const hasEntries = entries.some((e) => e.clientOrgNr === profile.orgNr);
  const allClean = entries
    .filter((e) => e.clientOrgNr === profile.orgNr)
    .every((e) => e.dataQualityStatus === "clean");

  if (hasRate && hasEntries && allClean) return "H";
  if (hasRate && hasEntries) return "M";
  return "L";
}
