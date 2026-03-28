/**
 * TIDSVOKTER — Time Tracking & Profitability Bridge (Priority: 3.5)
 *
 * Syncs timesheet data from Tripletex, calculates per-client profitability,
 * and prepares invoices. Triggered: daily cron.
 *
 * Flow:
 *   1. Fetch timesheet entries from Tripletex
 *   2. Validate through Renvasken
 *   3. Persist clean entries to Supabase
 *   4. Calculate per-client profitability
 *   5. Flag unprofitable clients
 *   6. Prepare invoices (G4 gate for sending)
 *   7. Audit trail
 */

import { insertTimeEntries } from "../../lib/supabase-client.ts";
import { logAction } from "../../shared/audit-logger.ts";
import type { ClientProfitability, ClientProfile, TimeEntry } from "../../shared/types.ts";
import { prepareInvoice, type PreparedInvoice } from "./invoice-prep.ts";
import { calculateBatchProfitability, profitabilityConfidence } from "./profitability.ts";
import {
  mapTimesheetEntries,
  validateTimesheetEntries,
  type TripletexTimesheetEntry,
} from "./timesheet-sync.ts";

const AGENT_ID = "paperclip-tid-01";

/** Default employee cost rate (NOK/hour) for profitability calculations. */
const DEFAULT_EMPLOYEE_COST_RATE = 650;

export interface TidsvokterInput {
  dateFrom: string;
  dateTo: string;
  clientProfiles: ClientProfile[];
  clientOrgNrByProject: Map<number, string>;
  employeeCostRate?: number;
  tripletexClient: {
    getTimesheetEntries: (params: Record<string, string | number | boolean>) => Promise<{
      values: Record<string, unknown>[];
    }>;
  };
}

export interface TidsvokterResult {
  totalEntries: number;
  cleanEntries: number;
  suspectEntries: number;
  dirtyEntries: number;
  persisted: boolean;
  profitability: ClientProfitability[];
  unprofitableClients: ClientProfitability[];
  invoices: PreparedInvoice[];
}

/**
 * Run the daily timesheet sync and profitability calculation.
 */
export async function syncTimesheets(input: TidsvokterInput): Promise<TidsvokterResult> {
  const costRate = input.employeeCostRate ?? DEFAULT_EMPLOYEE_COST_RATE;

  await logAction({
    agentId: AGENT_ID,
    action: "timesheet_sync_start",
    targetType: "timesheet",
    inputData: { dateFrom: input.dateFrom, dateTo: input.dateTo },
    confidence: "H",
    rationale: `Starting timesheet sync: ${input.dateFrom} to ${input.dateTo}`,
  });

  // Step 1: Fetch from Tripletex
  const response = await input.tripletexClient.getTimesheetEntries({
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });

  const rawEntries = response.values as unknown as TripletexTimesheetEntry[];
  const entries = mapTimesheetEntries(rawEntries, input.clientOrgNrByProject);

  // Step 2: Validate through Renvasken
  const { clean, suspect, dirty } = validateTimesheetEntries(entries);

  // Step 3: Persist clean entries to Supabase
  let persisted = false;
  if (clean.length > 0) {
    try {
      await insertTimeEntries(clean);
      persisted = true;
    } catch {
      // Non-fatal
    }
  }

  // Step 4: Calculate profitability (using clean entries only)
  const profitability = calculateBatchProfitability(input.clientProfiles, clean, costRate);

  // Step 5: Flag unprofitable clients
  const unprofitableClients = profitability.filter((p) => p.flag === "UNPROFITABLE");

  // Step 6: Prepare invoices
  const invoices: PreparedInvoice[] = [];
  for (const profile of input.clientProfiles) {
    const invoice = prepareInvoice(profile, clean, input.dateFrom, input.dateTo);
    if (invoice.lines.length > 0) {
      invoices.push(invoice);
    }
  }

  // Log unprofitable clients
  if (unprofitableClients.length > 0) {
    await logAction({
      agentId: AGENT_ID,
      action: "unprofitable_clients_flagged",
      targetType: "profitability",
      outputData: {
        count: unprofitableClients.length,
        clients: unprofitableClients.map((c) => ({
          name: c.clientName,
          margin: c.marginPercentage,
          hours: c.hoursThisPeriod,
        })),
      },
      confidence: "M",
      rationale: `${unprofitableClients.length} unprofitable clients flagged for review`,
    });
  }

  await logAction({
    agentId: AGENT_ID,
    action: "timesheet_sync_complete",
    targetType: "timesheet",
    outputData: {
      totalEntries: entries.length,
      clean: clean.length,
      suspect: suspect.length,
      dirty: dirty.length,
      persisted,
      invoiceCount: invoices.length,
    },
    confidence: dirty.length === 0 ? "H" : "M",
    rationale: `Sync complete: ${clean.length} clean, ${suspect.length} suspect, ${dirty.length} dirty. ${invoices.length} invoices prepared.`,
  });

  return {
    totalEntries: entries.length,
    cleanEntries: clean.length,
    suspectEntries: suspect.length,
    dirtyEntries: dirty.length,
    persisted,
    profitability,
    unprofitableClients,
    invoices,
  };
}

export { mapTimesheetEntries, validateTimesheetEntries } from "./timesheet-sync.ts";
export { calculateClientProfitability, calculateBatchProfitability } from "./profitability.ts";
export { prepareInvoice } from "./invoice-prep.ts";
