import { z } from "zod";
import type { EttosConfig } from "./config/env.ts";
import type { SandboxGuard } from "./config/sandbox-guard.ts";

/**
 * Tripletex REST API v2 client.
 *
 * Wraps the key endpoints needed by ettOS domain agents:
 * - Vouchers (Bilagsansen, Renvasken)
 * - Reports (Portalklar)
 * - Customers (Velkomst)
 * - Timesheets (Tidsvokter)
 * - Employees (general)
 *
 * All write operations are gated by SandboxGuard.
 */

// --- Schemas ---

export const VoucherLineSchema = z.object({
  accountId: z.number(),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  description: z.string().optional(),
  vatCode: z.string().optional(),
});
export type VoucherLine = z.infer<typeof VoucherLineSchema>;

export const VoucherSchema = z.object({
  id: z.number().optional(),
  date: z.string(), // YYYY-MM-DD
  description: z.string(),
  lines: z.array(VoucherLineSchema).min(1),
});
export type Voucher = z.infer<typeof VoucherSchema>;

export const CustomerSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  organizationNumber: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  isCustomer: z.boolean().default(true),
  isSupplier: z.boolean().default(false),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const TimesheetEntrySchema = z.object({
  id: z.number(),
  employeeId: z.number(),
  projectId: z.number().optional(),
  activityId: z.number().optional(),
  date: z.string(),
  hours: z.number().nonnegative(),
  comment: z.string().optional(),
});
export type TimesheetEntry = z.infer<typeof TimesheetEntrySchema>;

export const EmployeeSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  employmentStartDate: z.string().optional(),
  department: z.string().optional(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

// --- API Response wrapper ---

interface TripletexResponse<T> {
  value: T;
  count?: number;
}

interface TripletexListResponse<T> {
  values: T[];
  count: number;
  totalCount: number;
}

// --- HTTP transport (injectable for testing) ---

export interface HttpTransport {
  get(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }>;
  post(
    url: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<{ status: number; body: string }>;
}

/** Default HTTP transport using fetch */
export function createFetchTransport(): HttpTransport {
  return {
    async get(url, headers) {
      const res = await fetch(url, { method: "GET", headers });
      return { status: res.status, body: await res.text() };
    },
    async post(url, headers, body) {
      const res = await fetch(url, { method: "POST", headers, body });
      return { status: res.status, body: await res.text() };
    },
  };
}

// --- Client ---

export class TripletexClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
  ) {
    super(message);
    this.name = "TripletexClientError";
  }
}

export interface TripletexClientOptions {
  config: EttosConfig;
  guard: SandboxGuard;
  transport?: HttpTransport;
}

export class TripletexClient {
  private baseUrl: string;
  private token: string;
  private companyId: string;
  private guard: SandboxGuard;
  private transport: HttpTransport;

  constructor(opts: TripletexClientOptions) {
    this.baseUrl = opts.config.tripletex.baseUrl;
    this.token = opts.config.tripletex.token;
    this.companyId = opts.config.tripletex.companyId;
    this.guard = opts.guard;
    this.transport = opts.transport ?? createFetchTransport();
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`0:${this.token}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private url(path: string, params?: Record<string, string>): string {
    const base = `${this.baseUrl}${path}`;
    if (!params) return base;
    const qs = new URLSearchParams(params).toString();
    return `${base}?${qs}`;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.url(path, params);
    const res = await this.transport.get(url, this.headers());
    if (res.status < 200 || res.status >= 300) {
      throw new TripletexClientError(`GET ${path} failed: ${res.body}`, res.status, path);
    }
    return JSON.parse(res.body) as T;
  }

  private async post<T>(path: string, body: unknown, agent: string): Promise<T> {
    await this.guard.check({
      agent,
      target: "tripletex",
      method: "POST",
      endpoint: path,
      description: `Create resource at ${path}`,
      payload: body,
    });

    const url = this.url(path);
    const res = await this.transport.post(url, this.headers(), JSON.stringify(body));
    if (res.status < 200 || res.status >= 300) {
      throw new TripletexClientError(`POST ${path} failed: ${res.body}`, res.status, path);
    }
    return JSON.parse(res.body) as T;
  }

  // --- Vouchers (Bilagsansen, Renvasken) ---

  async getVouchers(
    dateFrom: string,
    dateTo: string,
    from = 0,
    count = 100,
  ): Promise<TripletexListResponse<Voucher>> {
    return this.get("/ledger/voucher", {
      dateFrom,
      dateTo,
      from: String(from),
      count: String(count),
    });
  }

  async getVoucher(id: number): Promise<TripletexResponse<Voucher>> {
    return this.get(`/ledger/voucher/${id}`);
  }

  async createVoucher(
    voucher: Voucher,
    agent = "bilagsansen",
  ): Promise<TripletexResponse<Voucher>> {
    VoucherSchema.parse(voucher);
    return this.post("/ledger/voucher", voucher, agent);
  }

  // --- Reports (Portalklar) ---

  async getResultReport(dateFrom: string, dateTo: string): Promise<TripletexResponse<unknown>> {
    return this.get("/resultReport", { dateFrom, dateTo });
  }

  async getBalanceSheet(date: string): Promise<TripletexResponse<unknown>> {
    return this.get("/balanceSheet", { date });
  }

  // --- Customers (Velkomst) ---

  async getCustomers(from = 0, count = 100): Promise<TripletexListResponse<Customer>> {
    return this.get("/customer", { from: String(from), count: String(count) });
  }

  async getCustomer(id: number): Promise<TripletexResponse<Customer>> {
    return this.get(`/customer/${id}`);
  }

  async createCustomer(
    customer: Customer,
    agent = "velkomst",
  ): Promise<TripletexResponse<Customer>> {
    CustomerSchema.parse(customer);
    return this.post("/customer", customer, agent);
  }

  // --- Timesheets (Tidsvokter) ---

  async getTimesheetEntries(
    dateFrom: string,
    dateTo: string,
    employeeId?: number,
  ): Promise<TripletexListResponse<TimesheetEntry>> {
    const params: Record<string, string> = { dateFrom, dateTo };
    if (employeeId !== undefined) params.employeeId = String(employeeId);
    return this.get("/timesheet/entry", params);
  }

  // --- Employees ---

  async getEmployees(from = 0, count = 100): Promise<TripletexListResponse<Employee>> {
    return this.get("/employee", { from: String(from), count: String(count) });
  }

  async getEmployee(id: number): Promise<TripletexResponse<Employee>> {
    return this.get(`/employee/${id}`);
  }
}
