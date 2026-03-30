import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadEttosConfig } from "../src/shared/config/env.ts";
import { createSandboxGuard } from "../src/shared/config/sandbox-guard.ts";
import { TripletexClient, TripletexClientError } from "../src/shared/tripletex-client.ts";
import type { HttpTransport, Voucher, Customer } from "../src/shared/tripletex-client.ts";

function createMockTransport(): HttpTransport & {
  lastGet?: string;
  lastPost?: { url: string; body: string };
} {
  const transport: HttpTransport & { lastGet?: string; lastPost?: { url: string; body: string } } =
    {
      async get(url) {
        transport.lastGet = url;
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
});
