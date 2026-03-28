/**
 * Tidsvokter — Time tracking & profitability tests.
 */
import { describe, expect, it } from "vitest";
import { prepareInvoice } from "../src/agents/tidsvokter/invoice-prep.ts";
import {
  calculateClientProfitability,
  calculateBatchProfitability,
} from "../src/agents/tidsvokter/profitability.ts";
import {
  mapTimesheetEntries,
  type TripletexTimesheetEntry,
} from "../src/agents/tidsvokter/timesheet-sync.ts";
import type { ClientProfile, TimeEntry } from "../src/shared/types.ts";

const mockTimesheetEntries: TripletexTimesheetEntry[] = [
  {
    id: 1001,
    employee: { id: 1, firstName: "Ola", lastName: "Nordmann" },
    project: { id: 100, name: "Test Bedrift AS" },
    date: "2026-03-15",
    hours: 3.5,
    chargeableHours: 3.5,
    hourlyRate: 850,
    comment: "Månedsavslutning",
  },
  {
    id: 1002,
    employee: { id: 1, firstName: "Ola", lastName: "Nordmann" },
    project: { id: 100, name: "Test Bedrift AS" },
    date: "2026-03-16",
    hours: 2.0,
    chargeableHours: 2.0,
    hourlyRate: 850,
    comment: "MVA-oppgjør",
  },
  {
    id: 1003,
    employee: { id: 2, firstName: "Kari", lastName: "Hansen" },
    project: { id: 200, name: "Eiendom AS" },
    date: "2026-03-15",
    hours: 4.0,
    chargeableHours: 4.0,
    hourlyRate: 750,
  },
];

const clientOrgNrByProject = new Map<number, string>([
  [100, "123456789"],
  [200, "987654321"],
]);

describe("Tidsvokter Timesheet Sync", () => {
  it("maps Tripletex entries to TimeEntry format", () => {
    const entries = mapTimesheetEntries(mockTimesheetEntries, clientOrgNrByProject);
    expect(entries).toHaveLength(3);
    expect(entries[0].employeeName).toBe("Ola Nordmann");
    expect(entries[0].clientOrgNr).toBe("123456789");
    expect(entries[0].billable).toBe(true);
    expect(entries[0].hours).toBe(3.5);
  });

  it("maps entries without project to undefined orgNr", () => {
    const noProject: TripletexTimesheetEntry = {
      id: 999,
      employee: { id: 3, firstName: "Per", lastName: "Olsen" },
      date: "2026-03-15",
      hours: 1.0,
    };
    const entries = mapTimesheetEntries([noProject], clientOrgNrByProject);
    expect(entries[0].clientOrgNr).toBeUndefined();
    expect(entries[0].billable).toBe(false);
  });
});

describe("Tidsvokter Profitability", () => {
  const entries = mapTimesheetEntries(mockTimesheetEntries, clientOrgNrByProject);

  const profileFixed: ClientProfile = {
    orgNr: "123456789",
    companyName: "Test Bedrift AS",
    pricingModel: "fixed",
    monthlyFixedPrice: 15000,
    onboardingStatus: "complete",
    dataQualityStatus: "clean",
  };

  const profileHourly: ClientProfile = {
    orgNr: "987654321",
    companyName: "Eiendom AS",
    pricingModel: "hourly",
    hourlyRate: 1200,
    onboardingStatus: "complete",
    dataQualityStatus: "clean",
  };

  it("calculates fixed-price profitability", () => {
    const result = calculateClientProfitability(profileFixed, entries, 650);
    expect(result.clientName).toBe("Test Bedrift AS");
    expect(result.hoursThisPeriod).toBe(5.5); // 3.5 + 2.0
    expect(result.revenueThisPeriod).toBe(15000);
    expect(result.isFixedPrice).toBe(true);
    expect(result.employeeCostAllocated).toBe(5.5 * 650);
  });

  it("calculates hourly profitability", () => {
    const result = calculateClientProfitability(profileHourly, entries, 650);
    expect(result.hoursThisPeriod).toBe(4.0);
    expect(result.revenueThisPeriod).toBe(4.0 * 1200);
    expect(result.isFixedPrice).toBe(false);
  });

  it("flags unprofitable clients", () => {
    const expensiveProfile: ClientProfile = {
      ...profileFixed,
      monthlyFixedPrice: 1000, // Very low fixed price
    };
    const result = calculateClientProfitability(expensiveProfile, entries, 650);
    expect(result.flag).toBe("UNPROFITABLE");
  });

  it("flags profitable clients", () => {
    const cheapProfile: ClientProfile = {
      ...profileFixed,
      monthlyFixedPrice: 50000,
    };
    const result = calculateClientProfitability(cheapProfile, entries, 650);
    expect(result.flag).toBe("PROFITABLE");
  });

  it("calculates batch profitability", () => {
    const results = calculateBatchProfitability([profileFixed, profileHourly], entries, 650);
    expect(results).toHaveLength(2);
  });
});

describe("Tidsvokter Invoice Prep", () => {
  const entries: TimeEntry[] = [
    {
      employeeId: 1,
      employeeName: "Ola Nordmann",
      clientOrgNr: "123456789",
      date: "2026-03-15",
      hours: 3.5,
      hourlyRate: 850,
      billable: true,
      dataQualityStatus: "clean",
    },
    {
      employeeId: 1,
      employeeName: "Ola Nordmann",
      clientOrgNr: "123456789",
      date: "2026-03-16",
      hours: 2.0,
      hourlyRate: 850,
      billable: true,
      dataQualityStatus: "clean",
    },
  ];

  it("prepares fixed-price invoice", () => {
    const profile: ClientProfile = {
      orgNr: "123456789",
      companyName: "Test Bedrift AS",
      pricingModel: "fixed",
      monthlyFixedPrice: 15000,
      onboardingStatus: "complete",
      dataQualityStatus: "clean",
    };

    const invoice = prepareInvoice(profile, entries, "2026-03-01", "2026-03-31");
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.subtotal).toBe(15000);
    expect(invoice.vatAmount).toBe(15000 * 0.25);
    expect(invoice.total).toBe(15000 + 15000 * 0.25);
    expect(invoice.currency).toBe("NOK");
  });

  it("prepares hourly invoice grouped by employee", () => {
    const profile: ClientProfile = {
      orgNr: "123456789",
      companyName: "Test Bedrift AS",
      pricingModel: "hourly",
      hourlyRate: 1200,
      onboardingStatus: "complete",
      dataQualityStatus: "clean",
    };

    const invoice = prepareInvoice(profile, entries, "2026-03-01", "2026-03-31");
    expect(invoice.lines).toHaveLength(1); // One employee
    expect(invoice.lines[0].quantity).toBe(5.5);
    expect(invoice.lines[0].unitPrice).toBe(1200);
  });

  it("prepares mixed invoice with overage", () => {
    const profile: ClientProfile = {
      orgNr: "123456789",
      companyName: "Test Bedrift AS",
      pricingModel: "mixed",
      monthlyFixedPrice: 3000,
      hourlyRate: 1000,
      onboardingStatus: "complete",
      dataQualityStatus: "clean",
    };

    const invoice = prepareInvoice(profile, entries, "2026-03-01", "2026-03-31");
    expect(invoice.lines.length).toBeGreaterThanOrEqual(1);
    // Fixed line + overage line
    expect(invoice.lines[0].description).toContain("Fast regnskapspris");
  });

  it("handles no billable entries", () => {
    const nonBillableEntries = entries.map((e) => ({ ...e, billable: false }));
    const profile: ClientProfile = {
      orgNr: "123456789",
      companyName: "Test Bedrift AS",
      pricingModel: "hourly",
      hourlyRate: 1200,
      onboardingStatus: "complete",
      dataQualityStatus: "clean",
    };

    const invoice = prepareInvoice(profile, nonBillableEntries, "2026-03-01", "2026-03-31");
    expect(invoice.lines).toHaveLength(0);
    expect(invoice.subtotal).toBe(0);
  });
});
