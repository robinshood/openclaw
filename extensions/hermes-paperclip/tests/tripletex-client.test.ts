import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadEttosConfig } from "../src/shared/config/env.ts";
import { createSandboxGuard } from "../src/shared/config/sandbox-guard.ts";
import { TripletexClient, TripletexClientError } from "../src/shared/tripletex-client.ts";
import type { HttpTransport, Voucher, Customer } from "../src/shared/tripletex-client.ts";
import type { ResultReport, BalanceSheet } from "../src/shared/tripletex-schemas.ts";

const MOCK_RESULT_REPORT: ResultReport = {
  dateFrom: "2024-01-01",
  dateTo: "2024-01-31",
  revenueGroups: [
    {
      groupName: "Salgsinntekter",
      total: 500_000,
      accounts: [
        {
          accountNumber: 3000,
          accountName: "Salgsinntekt avgiftspliktig",
          closingBalance: 500_000,
        },
      ],
    },
  ],
  costGroups: [
    {
      groupName: "Lønnskostnader",
      total: 200_000,
      accounts: [{ accountNumber: 5000, accountName: "Lønn", closingBalance: 200_000 }],
    },
  ],
  totalRevenue: 500_000,
  totalCosts: 200_000,
  operatingResult: 300_000,
  netResult: 250_000,
  currency: "NOK",
};

const MOCK_BALANCE_SHEET: BalanceSheet = {
  date: "2024-01-31",
  assetGroups: [
    {
      groupName: "Omløpsmidler",
      total: 1_000_000,
      accounts: [{ accountNumber: 1920, accountName: "Bankinnskudd", balance: 1_000_000 }],
    },
  ],
  equityGroups: [
    {
      groupName: "Egenkapital",
      total: 600_000,
      accounts: [{ accountNumber: 2000, accountName: "Aksjekapital", balance: 600_000 }],
    },
  ],
  liabilityGroups: [
    {
      groupName: "Kortsiktig gjeld",
      total: 400_000,
      accounts: [{ accountNumber: 2400, accountName: "Leverandørgjeld", balance: 400_000 }],
    },
  ],
  totalAssets: 1_000_000,
  totalEquity: 600_000,
  totalLiabilities: 400_000,
  totalEquityAndLiabilities: 1_000_000,
  currency: "NOK",
};

function createMockTransport(): HttpTransport & {
  lastGet?: string;
  lastPost?: { url: string; body: string };
} {
  const transport: HttpTransport & { lastGet?: string; lastPost?: { url: string; body: string } } =
    {
      async get(url) {
        transport.lastGet = url;
        // Return typed report data for report endpoints
        if (url.includes("/resultReport")) {
          return { status: 200, body: JSON.stringify({ value: MOCK_RESULT_REPORT }) };
        }
        if (url.includes("/balanceSheet")) {
          return { status: 200, body: JSON.stringify({ value: MOCK_BALANCE_SHEET }) };
        }
        return {
          status: 200,
          body: JSON.stringify({ value: {}, values: [], count: 0, totalCount: 0 }),
        };
      },
      async post(url, _headers, body) {
        transport.lastPost = { url, body };
        return { status: 201, body: JSON.stringify({ value: { id: 1 } }) };
      },
    };
  return transport;
}

describe("TripletexClient", () => {
  beforeEach(() => {
    process.env.ETTOS_ENV = "sandbox";
    process.env.TRIPLETEX_TOKEN = "test-token-123";
    process.env.TRIPLETEX_COMPANY_ID = "99999";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
  });

  function createClient(transport?: HttpTransport) {
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config);
    return new TripletexClient({ config, guard, transport: transport ?? createMockTransport() });
  }

  it("constructs with sandbox base URL", () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    expect(client).toBeDefined();
  });

  it("GET vouchers calls correct endpoint", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    await client.getVouchers("2024-01-01", "2024-01-31");
    expect(transport.lastGet).toContain("/ledger/voucher");
    expect(transport.lastGet).toContain("dateFrom=2024-01-01");
    expect(transport.lastGet).toContain("dateTo=2024-01-31");
  });

  it("POST voucher validates input and calls guard", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    const voucher: Voucher = {
      date: "2024-01-15",
      description: "Test voucher",
      lines: [{ accountId: 1000, debit: 100, credit: 0 }],
    };
    await client.createVoucher(voucher);
    expect(transport.lastPost).toBeDefined();
    expect(transport.lastPost!.url).toContain("/ledger/voucher");
  });

  it("rejects invalid voucher (no lines)", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    await expect(
      client.createVoucher({ date: "2024-01-15", description: "Bad", lines: [] }),
    ).rejects.toThrow();
  });

  it("GET customers calls correct endpoint", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    await client.getCustomers();
    expect(transport.lastGet).toContain("/customer");
  });

  it("POST customer validates and creates", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    const customer: Customer = { name: "Test AS" };
    await client.createCustomer(customer);
    expect(transport.lastPost!.url).toContain("/customer");
  });

  it("GET timesheet entries with employee filter", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    await client.getTimesheetEntries("2024-01-01", "2024-01-31", 42);
    expect(transport.lastGet).toContain("employeeId=42");
  });

  it("GET employees calls correct endpoint", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    await client.getEmployees();
    expect(transport.lastGet).toContain("/employee");
  });

  it("throws TripletexClientError on API failure", async () => {
    const failTransport: HttpTransport = {
      async get() {
        return { status: 500, body: "Internal Server Error" };
      },
      async post() {
        return { status: 500, body: "Internal Server Error" };
      },
    };
    const client = createClient(failTransport);
    await expect(client.getVouchers("2024-01-01", "2024-01-31")).rejects.toThrow(
      TripletexClientError,
    );
  });

  // --- Report schema tests (§1) ---

  it("getResultReport returns typed ResultReport", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    const result = await client.getResultReport("2024-01-01", "2024-01-31");
    expect(result.value.dateFrom).toBe("2024-01-01");
    expect(result.value.dateTo).toBe("2024-01-31");
    expect(result.value.totalRevenue).toBe(500_000);
    expect(result.value.operatingResult).toBe(300_000);
    expect(result.value.revenueGroups).toHaveLength(1);
    expect(result.value.revenueGroups![0].accounts![0].accountNumber).toBe(3000);
  });

  it("getBalanceSheet returns typed BalanceSheet", async () => {
    const transport = createMockTransport();
    const client = createClient(transport);
    const result = await client.getBalanceSheet("2024-01-31");
    expect(result.value.date).toBe("2024-01-31");
    expect(result.value.totalAssets).toBe(1_000_000);
    expect(result.value.totalEquity).toBe(600_000);
    expect(result.value.assetGroups).toHaveLength(1);
    expect(result.value.assetGroups![0].accounts![0].accountName).toBe("Bankinnskudd");
  });

  it("getResultReport accepts partial report (minimal fields)", async () => {
    const minimalTransport: HttpTransport = {
      async get() {
        return {
          status: 200,
          body: JSON.stringify({ value: { dateFrom: "2024-01-01", dateTo: "2024-01-31" } }),
        };
      },
      async post() {
        return { status: 200, body: "{}" };
      },
    };
    const client = createClient(minimalTransport);
    const result = await client.getResultReport("2024-01-01", "2024-01-31");
    expect(result.value.dateFrom).toBe("2024-01-01");
    expect(result.value.totalRevenue).toBeUndefined();
  });

  it("getResultReport rejects invalid report data (missing dateFrom)", async () => {
    const badTransport: HttpTransport = {
      async get() {
        return {
          status: 200,
          body: JSON.stringify({ value: { totalRevenue: 100 } }),
        };
      },
      async post() {
        return { status: 200, body: "{}" };
      },
    };
    const client = createClient(badTransport);
    await expect(client.getResultReport("2024-01-01", "2024-01-31")).rejects.toThrow();
  });

  it("getBalanceSheet accepts report with extra unknown fields (passthrough)", async () => {
    const extendedTransport: HttpTransport = {
      async get() {
        return {
          status: 200,
          body: JSON.stringify({
            value: {
              date: "2024-01-31",
              totalAssets: 500_000,
              unknownFutureField: "should pass through",
              deepNested: { a: { b: 1 } },
            },
          }),
        };
      },
      async post() {
        return { status: 200, body: "{}" };
      },
    };
    const client = createClient(extendedTransport);
    const result = await client.getBalanceSheet("2024-01-31");
    expect(result.value.date).toBe("2024-01-31");
    // Passthrough fields should survive
    expect((result.value as Record<string, unknown>).unknownFutureField).toBe(
      "should pass through",
    );
  });

  // --- Error path tests (§8) ---

  it("handles malformed JSON response", async () => {
    const badJsonTransport: HttpTransport = {
      async get() {
        return { status: 200, body: "not valid json {{{" };
      },
      async post() {
        return { status: 200, body: "not valid json" };
      },
    };
    const client = createClient(badJsonTransport);
    await expect(client.getVouchers("2024-01-01", "2024-01-31")).rejects.toThrow();
  });

  it("handles HTTP 429 rate limit response", async () => {
    const rateLimitTransport: HttpTransport = {
      async get() {
        return { status: 429, body: "Rate limit exceeded" };
      },
      async post() {
        return { status: 429, body: "Rate limit exceeded" };
      },
    };
    const client = createClient(rateLimitTransport);
    await expect(client.getEmployees()).rejects.toThrow(TripletexClientError);
    try {
      await client.getEmployees();
    } catch (e) {
      expect((e as TripletexClientError).status).toBe(429);
    }
  });

  it("handles HTTP 401 unauthorized", async () => {
    const authFailTransport: HttpTransport = {
      async get() {
        return { status: 401, body: "Unauthorized" };
      },
      async post() {
        return { status: 401, body: "Unauthorized" };
      },
    };
    const client = createClient(authFailTransport);
    await expect(client.getCustomers()).rejects.toThrow(TripletexClientError);
  });

  it("handles network timeout (transport throws)", async () => {
    const timeoutTransport: HttpTransport = {
      async get() {
        throw new Error("network timeout");
      },
      async post() {
        throw new Error("network timeout");
      },
    };
    const client = createClient(timeoutTransport);
    await expect(client.getVouchers("2024-01-01", "2024-01-31")).rejects.toThrow("network timeout");
  });
});
