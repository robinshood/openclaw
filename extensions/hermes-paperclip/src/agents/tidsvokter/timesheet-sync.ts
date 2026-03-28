/**
 * Tidsvokter — Timesheet sync from Tripletex.
 *
 * Fetches timesheet entries and validates through Renvasken.
 * Ensures data quality before profitability calculations.
 */

import type { TimeEntry, DataQualityStatus } from "../../shared/types.ts";
import { validateRecord } from "../renvasken/index.ts";

export interface TripletexTimesheetEntry {
  id: number;
  employee: { id: number; firstName: string; lastName: string };
  project?: { id: number; name: string };
  activity?: { id: number; name: string };
  date: string;
  hours: number;
  chargeableHours?: number;
  comment?: string;
  hourlyRate?: number;
}

/**
 * Convert Tripletex timesheet entries to our TimeEntry format.
 */
export function mapTimesheetEntries(
  raw: TripletexTimesheetEntry[],
  clientOrgNrByProject: Map<number, string>,
): TimeEntry[] {
  return raw.map((entry) => ({
    tripletexEntryId: entry.id,
    employeeId: entry.employee.id,
    employeeName: `${entry.employee.firstName} ${entry.employee.lastName}`,
    clientOrgNr: entry.project ? clientOrgNrByProject.get(entry.project.id) : undefined,
    projectId: entry.project?.id,
    date: entry.date,
    hours: entry.hours,
    hourlyRate: entry.hourlyRate,
    billable: (entry.chargeableHours ?? 0) > 0,
    description: entry.comment,
    dataQualityStatus: "pending" as DataQualityStatus,
  }));
}

/**
 * Validate timesheet entries through Renvasken.
 * Returns entries split by quality status.
 */
export function validateTimesheetEntries(entries: TimeEntry[]): {
  clean: TimeEntry[];
  suspect: TimeEntry[];
  dirty: TimeEntry[];
} {
  const clean: TimeEntry[] = [];
  const suspect: TimeEntry[] = [];
  const dirty: TimeEntry[] = [];

  for (const entry of entries) {
    const result = validateRecord(
      `timesheet-${entry.tripletexEntryId ?? entry.employeeId}-${entry.date}`,
      entry as unknown as Record<string, unknown>,
      { source: "tripletex", recordType: "employee" },
    );

    const updated = { ...entry, dataQualityStatus: result.status };

    switch (result.status) {
      case "clean":
        clean.push(updated);
        break;
      case "suspect":
        suspect.push(updated);
        break;
      default:
        dirty.push(updated);
        break;
    }
  }

  return { clean, suspect, dirty };
}
