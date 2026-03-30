import { describe, it, expect, beforeAll } from "vitest";
import { loadEttosConfig } from "../config/env.ts";
import { createSandboxGuard } from "../config/sandbox-guard.ts";
import { TripletexClient } from "../tripletex-client.ts";
import { VoucherSchema, CustomerSchema, EmployeeSchema } from "../tripletex-client.ts";
import { ResultReportSchema, BalanceSheetSchema } from "../tripletex-schemas.ts";

/**
 * Tripletex API integration tests.
 *
 * These tests run ONLY when TRIPLETEX_TOKEN and TRIPLETEX_COMPANY_ID are set.
 * They hit the real Tripletex sandbox API to validate response shapes.
 *
 * Run: TRIPLETEX_TOKEN=xxx TRIPLETEX_COMPANY_ID=yyy pnpm test:integration
 * Skip: tests auto-skip when env vars are not set.
 */

const HAS_TOKEN = Boolean(process.env.TRIPLETEX_TOKEN && process.env.TRIPLETEX_COMPANY_ID);

describe.skipIf(!HAS_TOKEN)("Tripletex Integration", () => {
  let client: TripletexClient;

  beforeAll(() => {
    // Ensure sandbox mode for integration tests
    process.env.ETTOS_ENV = "sandbox";
    process.env.NOTION_API_KEY = process.env.NOTION_API_KEY ?? "integration-placeholder";
    process.env.NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID ?? "integration-placeholder";
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config);
    client = new TripletexClient({ config, guard });
  });

  it("getEmployees returns valid employee shapes", async () => {
    const result = await client.getEmployees(0, 5);
    expect(result.values).toBeDefined();
    expect(Array.isArray(result.values)).toBe(true);
    for (const emp of result.values) {
      expect(() => EmployeeSchema.parse(emp)).not.toThrow();
    }
  });

  it("getVouchers returns paginated results with valid shapes", async () => {
    // Use a wide date range to ensure some results
    const result = await client.getVouchers("2024-01-01", "2024-12-31", 0, 5);
    expect(result.values).toBeDefined();
    expect(typeof result.count).toBe("number");
    for (const v of result.values) {
      expect(() => VoucherSchema.parse(v)).not.toThrow();
    }
  });

  it("createVoucher writes to sandbox and returns created voucher", async () => {
    const voucher = {
      date: new Date().toISOString().split("T")[0],
      description: "Integration test voucher — safe to delete",
      lines: [
        { accountId: 1920, debit: 100, credit: 0, description: "Test debit" },
        { accountId: 3000, debit: 0, credit: 100, description: "Test credit" },
      ],
    };
    const result = await client.createVoucher(voucher);
    expect(result.value).toBeDefined();
  });

  it("getResultReport returns typed report matching schema", async () => {
    const result = await client.getResultReport("2024-01-01", "2024-12-31");
    expect(result.value.dateFrom).toBe("2024-01-01");
    expect(result.value.dateTo).toBe("2024-12-31");
    // Schema validation already happens inside getResultReport;
    // if we get here without throwing, the schema matches
    expect(() => ResultReportSchema.parse(result.value)).not.toThrow();
  });

  it("getBalanceSheet returns typed balance matching schema", async () => {
    const result = await client.getBalanceSheet("2024-12-31");
    expect(result.value.date).toBe("2024-12-31");
    expect(() => BalanceSheetSchema.parse(result.value)).not.toThrow();
  });
});
