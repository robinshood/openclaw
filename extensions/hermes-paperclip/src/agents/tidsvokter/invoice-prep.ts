/**
 * Tidsvokter — Invoice preparation.
 *
 * Prepares invoice data for clients based on time entries and pricing model.
 * Does NOT send invoices — that requires G4 approval.
 */

import type { ClientProfile, TimeEntry } from "../../shared/types.ts";

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: number;
}

export interface PreparedInvoice {
  clientOrgNr: string;
  clientName: string;
  periodFrom: string;
  periodTo: string;
  lines: InvoiceLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
}

const DEFAULT_VAT_RATE = 25;

/**
 * Prepare an invoice for a client based on their time entries and pricing model.
 */
export function prepareInvoice(
  profile: ClientProfile,
  entries: TimeEntry[],
  periodFrom: string,
  periodTo: string,
): PreparedInvoice {
  const clientEntries = entries
    .filter((e) => e.clientOrgNr === profile.orgNr && e.billable)
    .filter((e) => e.date >= periodFrom && e.date <= periodTo);

  const lines: InvoiceLine[] = [];

  if (profile.pricingModel === "fixed") {
    lines.push({
      description: `Fast regnskapspris — ${profile.companyName}`,
      quantity: 1,
      unitPrice: profile.monthlyFixedPrice ?? 0,
      amount: profile.monthlyFixedPrice ?? 0,
      vatRate: DEFAULT_VAT_RATE,
    });
  } else if (profile.pricingModel === "hourly") {
    // Group by employee
    const byEmployee = groupByEmployee(clientEntries);
    for (const [name, empEntries] of byEmployee) {
      const hours = empEntries.reduce((sum, e) => sum + e.hours, 0);
      const rate = profile.hourlyRate ?? empEntries[0]?.hourlyRate ?? 0;
      lines.push({
        description: `Regnskapstjenester — ${name}`,
        quantity: Math.round(hours * 100) / 100,
        unitPrice: rate,
        amount: Math.round(hours * rate * 100) / 100,
        vatRate: DEFAULT_VAT_RATE,
      });
    }
  } else {
    // Mixed: fixed base + hourly overage
    const fixedAmount = profile.monthlyFixedPrice ?? 0;
    lines.push({
      description: `Fast regnskapspris — ${profile.companyName}`,
      quantity: 1,
      unitPrice: fixedAmount,
      amount: fixedAmount,
      vatRate: DEFAULT_VAT_RATE,
    });

    const budgetedHours = profile.hourlyRate && fixedAmount ? fixedAmount / profile.hourlyRate : 0;
    const totalBillableHours = clientEntries.reduce((sum, e) => sum + e.hours, 0);
    const overageHours = Math.max(0, totalBillableHours - budgetedHours);

    if (overageHours > 0) {
      lines.push({
        description: `Tilleggstimer utover avtale (${Math.round(overageHours * 100) / 100} timer)`,
        quantity: Math.round(overageHours * 100) / 100,
        unitPrice: profile.hourlyRate ?? 0,
        amount: Math.round(overageHours * (profile.hourlyRate ?? 0) * 100) / 100,
        vatRate: DEFAULT_VAT_RATE,
      });
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const vatAmount = Math.round(subtotal * (DEFAULT_VAT_RATE / 100) * 100) / 100;

  return {
    clientOrgNr: profile.orgNr,
    clientName: profile.companyName,
    periodFrom,
    periodTo,
    lines,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    currency: "NOK",
  };
}

function groupByEmployee(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const map = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const name = entry.employeeName ?? `Employee ${entry.employeeId}`;
    const existing = map.get(name);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(name, [entry]);
    }
  }
  return map;
}
