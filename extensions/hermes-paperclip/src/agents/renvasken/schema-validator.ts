/**
 * Renvasken Layer 1: Schema Validation (Deterministic — no LLM needed).
 *
 * Runs Zod schemas on every record. Catches ~60% of issues.
 * Zero cost, millisecond latency.
 */

import type { ZodType } from "zod";
import type { ValidationIssue } from "../../shared/types.ts";
import { BrregEnhetSchema } from "./schemas/brreg.schema.ts";
import { CustomerSchema } from "./schemas/customer.schema.ts";
import { EmployeeSchema } from "./schemas/employee.schema.ts";
import { TransactionSchema } from "./schemas/transaction.schema.ts";
import { VoucherSchema } from "./schemas/voucher.schema.ts";

const SCHEMA_MAP: Record<string, ZodType> = {
  voucher: VoucherSchema,
  customer: CustomerSchema,
  transaction: TransactionSchema,
  employee: EmployeeSchema,
  brreg: BrregEnhetSchema,
};

export interface SchemaValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}

/**
 * Validate a record against its Zod schema.
 * Returns pass/fail with detailed field-level issues.
 */
export function validateSchema(
  recordType: string,
  data: Record<string, unknown>,
): SchemaValidationResult {
  const schema = SCHEMA_MAP[recordType];
  if (!schema) {
    return {
      passed: false,
      issues: [
        {
          layer: 1,
          check: "schema_exists",
          message: `No schema found for record type: ${recordType}`,
          severity: "BLOCK",
        },
      ],
    };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { passed: true, issues: [] };
  }

  const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
    layer: 1 as const,
    check: `schema_${issue.code}`,
    message: issue.message,
    severity: "BLOCK" as const,
    field: issue.path.join("."),
    value: (data as Record<string, unknown>)[String(issue.path[0])],
  }));

  return { passed: false, issues };
}

/**
 * Validate encoding — ensure UTF-8 normalization for Norwegian chars (æøåÆØÅ).
 */
export function validateEncoding(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      // Check for common encoding issues with Norwegian characters
      if (/Ã¦|Ã¸|Ã¥|Ã†|Ã˜|Ã…/.test(value)) {
        issues.push({
          layer: 1,
          check: "encoding_utf8",
          message: `Field '${key}' contains incorrectly encoded Norwegian characters (likely Latin-1 interpreted as UTF-8)`,
          severity: "WARN",
          field: key,
          value,
        });
      }
    }
  }

  return issues;
}

/** Get supported record types. */
export function getSupportedTypes(): string[] {
  return Object.keys(SCHEMA_MAP);
}
