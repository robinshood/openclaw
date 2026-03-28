/**
 * Renvasken Layer 4: Bokføringsloven Compliance.
 *
 * Norwegian accounting regulation rules — legal requirements, not suggestions.
 * Failure = BLOCK.
 */

import type { ValidationIssue } from "../../shared/types.ts";

/**
 * Run Bokføringsloven compliance checks on a record.
 */
export function checkCompliance(
  recordType: string,
  data: Record<string, unknown>,
): ValidationIssue[] {
  switch (recordType) {
    case "voucher":
      return checkVoucherCompliance(data);
    default:
      return [];
  }
}

/**
 * Bokføringsloven §5 — Every voucher must have:
 * date, description, amount, account number, MVA code.
 */
function checkVoucherCompliance(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // §5: Required voucher fields
  const requiredFields = [
    { field: "date", label: "dato" },
    { field: "description", label: "beskrivelse" },
  ];

  for (const { field, label } of requiredFields) {
    if (!data[field]) {
      issues.push({
        layer: 4,
        check: "bokforingsloven_5",
        message: `Bokføringsloven §5: Bilag mangler ${label}`,
        severity: "BLOCK",
        field,
      });
    }
  }

  // Check postings
  const postings = data.postings;
  if (!Array.isArray(postings) || postings.length === 0) {
    issues.push({
      layer: 4,
      check: "bokforingsloven_5",
      message: "Bokføringsloven §5: Bilag must have at least one posting with account and amount",
      severity: "BLOCK",
      field: "postings",
    });
    return issues;
  }

  for (let i = 0; i < postings.length; i++) {
    const p = postings[i] as Record<string, unknown>;

    if (typeof p.accountNr !== "number" || p.accountNr < 1000 || p.accountNr > 9999) {
      issues.push({
        layer: 4,
        check: "bokforingsloven_5",
        message: `Bokføringsloven §5: Postering ${i + 1} mangler gyldig kontonummer`,
        severity: "BLOCK",
        field: `postings[${i}].accountNr`,
        value: p.accountNr,
      });
    }

    if (typeof p.amount !== "number" || p.amount === 0) {
      issues.push({
        layer: 4,
        check: "bokforingsloven_5",
        message: `Bokføringsloven §5: Postering ${i + 1} mangler beløp`,
        severity: "BLOCK",
        field: `postings[${i}].amount`,
        value: p.amount,
      });
    }
  }

  // §5: Voucher date cannot be in the future
  if (typeof data.date === "string") {
    const voucherDate = new Date(data.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (voucherDate > today) {
      issues.push({
        layer: 4,
        check: "bokforingsloven_5",
        message: "Bokføringsloven §5: Bilagsdato kan ikke være i fremtiden",
        severity: "BLOCK",
        field: "date",
        value: data.date,
      });
    }
  }

  // §7: Check voucher numbering (sequential, no gaps)
  if (typeof data.voucherNumber === "number" && typeof data.previousVoucherNumber === "number") {
    const expected = (data.previousVoucherNumber as number) + 1;
    if (data.voucherNumber !== expected) {
      issues.push({
        layer: 4,
        check: "bokforingsloven_7",
        message: `Bokføringsloven §7: Gap i bilagsnummerering. Forventet ${expected}, fikk ${data.voucherNumber}`,
        severity: "WARN",
        field: "voucherNumber",
        value: data.voucherNumber,
      });
    }
  }

  // MVA code validation on postings
  for (let i = 0; i < postings.length; i++) {
    const p = postings[i] as Record<string, unknown>;
    if (p.mvaCode !== undefined) {
      const rate = p.mvaCode as number;
      if (![0, 12, 15, 25].includes(rate)) {
        issues.push({
          layer: 4,
          check: "mva_rate_invalid",
          message: `MVA-sats ${rate}% er ugyldig. Må være 0, 12, 15 eller 25`,
          severity: "BLOCK",
          field: `postings[${i}].mvaCode`,
          value: rate,
        });
      }
    }

    // Account 7100 should only be used for representasjon
    if (p.accountNr === 7100) {
      const desc = String(p.description ?? data.description ?? "").toLowerCase();
      if (
        !desc.includes("representasjon") &&
        !desc.includes("bevertning") &&
        !desc.includes("restaurant")
      ) {
        issues.push({
          layer: 4,
          check: "account_usage",
          message: "Konto 7100 skal kun brukes for representasjon/bevertning",
          severity: "WARN",
          field: `postings[${i}].accountNr`,
          value: 7100,
        });
      }
    }
  }

  return issues;
}
