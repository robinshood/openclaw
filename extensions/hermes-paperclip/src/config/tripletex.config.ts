/**
 * Tripletex API configuration.
 * SANDBOX FIRST: All calls go to api-test.tripletex.tech unless PROD_CONFIRM=true.
 */

export const TRIPLETEX_BASE = {
  test: "https://api-test.tripletex.tech/v2",
  prod: "https://tripletex.no/v2",
} as const;

export function getTripletexBase(): string {
  const env = process.env.TRIPLETEX_ENV ?? "test";
  if (env === "prod" && process.env.PROD_CONFIRM !== "true") {
    throw new Error("PROD_CONFIRM must be 'true' to use production Tripletex API");
  }
  return env === "prod" ? TRIPLETEX_BASE.prod : TRIPLETEX_BASE.test;
}

/** All Tripletex endpoints used by agents. */
export const ENDPOINTS = {
  // Auth
  session: "PUT /token/session/:create",

  // Customer & Company
  customers: "GET /customer",
  customer: "GET /customer/{id}",
  company: "GET /company",
  companyAccess: "GET /company/>withLoginAccess",

  // Vouchers & Postings
  vouchers: "GET /ledger/voucher",
  createVoucher: "POST /ledger/voucher",
  postings: "GET /ledger/posting",
  createPosting: "POST /ledger/posting",
  accounts: "GET /ledger/account",

  // Invoices
  invoices: "GET /invoice",
  createInvoice: "POST /invoice",

  // Bank & Payments
  bankStatements: "GET /bank/statement",
  bankReconcile: "GET /bank/reconciliation",

  // Payroll
  salary: "GET /salary/transaction",
  employees: "GET /employee",

  // Time tracking
  timesheetEntry: "GET /timesheet/entry",
  timesheetWeek: "GET /timesheet/week",

  // Reports
  resultReport: "GET /resultReport",
  balanceSheet: "GET /balanceSheet",
  vatReturns: "GET /ledger/vatType",

  // Projects & Departments
  projects: "GET /project",
  departments: "GET /department",
} as const;
