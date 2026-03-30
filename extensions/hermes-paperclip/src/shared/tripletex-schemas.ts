import { z } from "zod";

/**
 * Tripletex API v2 report response schemas.
 *
 * These schemas type the responses from /resultReport and /balanceSheet.
 * Based on Tripletex API v2 documentation. Deeply nested fields that
 * Portalklar does not yet consume use z.passthrough() for forward compat.
 */

// --- Result Report (Resultatregnskap) ---

export const ResultReportAccountSchema = z
  .object({
    accountNumber: z.number(),
    accountName: z.string(),
    /** Opening balance for the period */
    openingBalance: z.number().optional(),
    /** Closing balance for the period */
    closingBalance: z.number().optional(),
    /** Change during the period (closingBalance - openingBalance) */
    change: z.number().optional(),
    /** Budget for the period (if configured) */
    budgetAmount: z.number().optional(),
    /** Accumulated year-to-date */
    accumulatedAmount: z.number().optional(),
    currency: z.string().optional(),
  })
  .passthrough();

export type ResultReportAccount = z.infer<typeof ResultReportAccountSchema>;

export const ResultReportGroupSchema = z
  .object({
    groupName: z.string(),
    /** Summary total for the group */
    total: z.number().optional(),
    accounts: z.array(ResultReportAccountSchema).optional(),
  })
  .passthrough();

export type ResultReportGroup = z.infer<typeof ResultReportGroupSchema>;

export const ResultReportSchema = z
  .object({
    /** Report period start date (YYYY-MM-DD) */
    dateFrom: z.string(),
    /** Report period end date (YYYY-MM-DD) */
    dateTo: z.string(),
    /** Revenue groups (driftsinntekter) */
    revenueGroups: z.array(ResultReportGroupSchema).optional(),
    /** Cost groups (driftskostnader) */
    costGroups: z.array(ResultReportGroupSchema).optional(),
    /** Summary totals */
    totalRevenue: z.number().optional(),
    totalCosts: z.number().optional(),
    operatingResult: z.number().optional(),
    /** Net financial items */
    financialIncome: z.number().optional(),
    financialExpenses: z.number().optional(),
    resultBeforeTax: z.number().optional(),
    taxExpense: z.number().optional(),
    netResult: z.number().optional(),
    currency: z.string().default("NOK"),
    // TODO Phase 1: type department/project breakdowns when Portalklar specifies requirements
  })
  .passthrough();

export type ResultReport = z.infer<typeof ResultReportSchema>;

// --- Balance Sheet (Balanse) ---

export const BalanceSheetAccountSchema = z
  .object({
    accountNumber: z.number(),
    accountName: z.string(),
    /** Balance at the report date */
    balance: z.number(),
    /** Budget balance (if configured) */
    budgetBalance: z.number().optional(),
    /** Balance at same date last year */
    lastYearBalance: z.number().optional(),
    currency: z.string().optional(),
  })
  .passthrough();

export type BalanceSheetAccount = z.infer<typeof BalanceSheetAccountSchema>;

export const BalanceSheetGroupSchema = z
  .object({
    groupName: z.string(),
    total: z.number().optional(),
    accounts: z.array(BalanceSheetAccountSchema).optional(),
  })
  .passthrough();

export type BalanceSheetGroup = z.infer<typeof BalanceSheetGroupSchema>;

export const BalanceSheetSchema = z
  .object({
    /** Report date (YYYY-MM-DD) */
    date: z.string(),
    /** Asset groups (eiendeler) */
    assetGroups: z.array(BalanceSheetGroupSchema).optional(),
    /** Equity groups (egenkapital) */
    equityGroups: z.array(BalanceSheetGroupSchema).optional(),
    /** Liability groups (gjeld) */
    liabilityGroups: z.array(BalanceSheetGroupSchema).optional(),
    /** Summary totals */
    totalAssets: z.number().optional(),
    totalEquity: z.number().optional(),
    totalLiabilities: z.number().optional(),
    totalEquityAndLiabilities: z.number().optional(),
    currency: z.string().default("NOK"),
    // TODO Phase 1: type sub-categories (current/non-current assets, short/long-term debt) when Portalklar specifies
  })
  .passthrough();

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;
