/**
 * Tripletex API client with session token auth and rate limiting.
 *
 * Auth flow:
 *   consumer token + employee token → PUT /token/session/:create → session token
 *   Session token used as Basic Auth (0:sessionToken) for all calls.
 *
 * Rate limiting: exponential backoff, max 3 retries.
 */

import { getTripletexBase } from "../config/tripletex.config.ts";

interface TripletexConfig {
  consumerToken: string;
  employeeToken: string;
  baseUrl?: string;
}

interface RequestOptions {
  method?: string;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class TripletexClient {
  private baseUrl: string;
  private consumerToken: string;
  private employeeToken: string;
  private sessionToken: string | null = null;
  private sessionExpiresAt: Date | null = null;

  constructor(config: TripletexConfig) {
    this.baseUrl = config.baseUrl ?? getTripletexBase();
    this.consumerToken = config.consumerToken;
    this.employeeToken = config.employeeToken;
  }

  /** Create or refresh session token. */
  async authenticate(): Promise<void> {
    const url = `${this.baseUrl}/token/session/:create?consumerToken=${encodeURIComponent(this.consumerToken)}&employeeToken=${encodeURIComponent(this.employeeToken)}&expirationDate=${this.expirationDate()}`;

    const res = await fetch(url, { method: "PUT" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tripletex auth failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { value: { token: string } };
    this.sessionToken = data.value.token;
    // Session expires at end of day; re-auth 1h before
    const exp = new Date();
    exp.setHours(23, 0, 0, 0);
    this.sessionExpiresAt = exp;
  }

  /** Ensure we have a valid session token. */
  private async ensureAuth(): Promise<string> {
    if (!this.sessionToken || !this.sessionExpiresAt || new Date() >= this.sessionExpiresAt) {
      await this.authenticate();
    }
    return this.sessionToken!;
  }

  /** Build auth header. */
  private async authHeader(): Promise<string> {
    const token = await this.ensureAuth();
    return `Basic ${btoa(`0:${token}`)}`;
  }

  /** Make an authenticated API request with retry + backoff. */
  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? "GET";
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const auth = await this.authHeader();
        const url = this.buildUrl(path, opts.params);

        const fetchOpts: RequestInit = {
          method,
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        };

        if (opts.body && method !== "GET") {
          fetchOpts.body = JSON.stringify(opts.body);
        }

        const res = await fetch(url, fetchOpts);

        // Rate limited — retry with backoff
        if (res.status === 429) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          await sleep(delay);
          continue;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Tripletex ${method} ${path} failed (${res.status}): ${text}`);
        }

        const json = await res.json();
        return json as T;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          await sleep(delay);
        }
      }
    }

    throw lastError ?? new Error(`Tripletex request failed after ${MAX_RETRIES} retries`);
  }

  // --- Convenience methods ---

  async getCustomers(params?: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/customer", { params });
  }

  async getBankStatements(params?: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/bank/statement", { params });
  }

  async getAccounts(params?: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/ledger/account", { params });
  }

  async getEmployees(params?: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/employee", { params });
  }

  async getDepartments(params?: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/department", { params });
  }

  async getTimesheetEntries(params: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/timesheet/entry", { params });
  }

  async getResultReport(params: Record<string, string | number | boolean>) {
    return this.request<TripletexResponse>("/resultReport", { params });
  }

  async getBalanceSheet(params: Record<string, string | number | boolean>) {
    return this.request<TripletexResponse>("/balanceSheet", { params });
  }

  async getCompaniesWithAccess() {
    return this.request<TripletexListResponse>("/company/>withLoginAccess");
  }

  async createVoucher(body: unknown) {
    return this.request<TripletexResponse>("/ledger/voucher", { method: "POST", body });
  }

  async createCustomer(body: unknown) {
    return this.request<TripletexResponse>("/customer", { method: "POST", body });
  }

  async createInvoice(body: unknown) {
    return this.request<TripletexResponse>("/invoice", { method: "POST", body });
  }

  async getProjects(params?: Record<string, string | number | boolean>) {
    return this.request<TripletexListResponse>("/project", { params });
  }

  async createProject(body: unknown) {
    return this.request<TripletexResponse>("/project", { method: "POST", body });
  }

  // --- Internals ---

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private expirationDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
}

/** Create client from env vars. */
export function createTripletexClient(): TripletexClient {
  const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN;
  const employeeToken = process.env.TRIPLETEX_EMPLOYEE_TOKEN;
  if (!consumerToken || !employeeToken) {
    throw new Error("TRIPLETEX_CONSUMER_TOKEN and TRIPLETEX_EMPLOYEE_TOKEN must be set");
  }
  return new TripletexClient({ consumerToken, employeeToken });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Response types ---

interface TripletexResponse {
  value: Record<string, unknown>;
}

interface TripletexListResponse {
  fullResultSize: number;
  from: number;
  count: number;
  values: Record<string, unknown>[];
}
