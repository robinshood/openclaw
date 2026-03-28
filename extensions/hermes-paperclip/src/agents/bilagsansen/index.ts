/**
 * BILAGSANSEN — Credit Card / Expense Voucher Automation (Priority: 4.1)
 *
 * Covers the gap that Propell.ai does NOT handle: credit card expenses.
 * Propell handles bank/invoice vouchers — do NOT rebuild that.
 *
 * Flow:
 *   1. Fetch bank statements from Tripletex (credit card account)
 *   2. Validate through Renvasken (data quality gate)
 *   3. Classify merchant → account + MVA
 *   4. Build voucher payloads
 *   5. Submit through G4 gate (human approval)
 *   6. POST to Tripletex (sandbox)
 *   7. Audit trail on everything
 */

import { logAction } from "../../shared/audit-logger.ts";
import { requestG4Approval, isBlocked } from "../../shared/g4-gate.ts";
import type { BankTransaction, TripletexVoucher } from "../../shared/types.ts";
import { validateRecord } from "../renvasken/index.ts";
import { classifyMerchant, type Classification } from "./classifier.ts";
import { buildVoucher, buildVoucherBatch, type ClassifiedTransaction } from "./voucher-builder.ts";

const AGENT_ID = "hermes-bilag-01";

export interface BilagsansenResult {
  totalTransactions: number;
  autoApproved: number;
  manualReview: number;
  escalated: number;
  posted: number;
  blocked: number;
  errors: Array<{ transactionId: string; error: string }>;
}

/**
 * Process a batch of credit card transactions end-to-end.
 *
 * Source → Renvasken → Classify → Build Voucher → G4 Gate → Tripletex
 */
export async function processCreditCardBatch(
  transactions: BankTransaction[],
  tripletexClient: { createVoucher: (body: unknown) => Promise<unknown> },
): Promise<BilagsansenResult> {
  const result: BilagsansenResult = {
    totalTransactions: transactions.length,
    autoApproved: 0,
    manualReview: 0,
    escalated: 0,
    posted: 0,
    blocked: 0,
    errors: [],
  };

  await logAction({
    agentId: AGENT_ID,
    action: "process_batch_start",
    targetType: "credit_card_transactions",
    inputData: { count: transactions.length },
    confidence: "H",
    rationale: `Starting credit card batch processing: ${transactions.length} transactions`,
  });

  // Step 1: Validate all transactions through Renvasken
  const validated: BankTransaction[] = [];
  for (const tx of transactions) {
    const validation = validateRecord(tx.id, tx as unknown as Record<string, unknown>, {
      source: "tripletex",
      recordType: "transaction",
    });

    if (validation.status === "dirty") {
      result.errors.push({
        transactionId: tx.id,
        error: `Failed Renvasken validation: ${validation.issues.map((i) => i.message).join("; ")}`,
      });
      continue;
    }

    validated.push(tx);
  }

  // Step 2: Classify and build vouchers
  const classified: ClassifiedTransaction[] = validated.map((tx) => {
    const classification = classifyMerchant(tx.merchantName ?? tx.description);
    return {
      id: tx.id,
      date: tx.date,
      merchantName: tx.merchantName ?? tx.description,
      amount: tx.amount,
      classification,
    };
  });

  const batch = buildVoucherBatch(classified);
  result.escalated = batch.escalate.length;
  result.manualReview = batch.manualReview.length;
  result.autoApproved = batch.autoApprove.length;

  // Step 3: Submit auto-approved vouchers through G4 gate
  for (const { transaction, voucher } of batch.autoApprove) {
    try {
      const decision = await requestG4Approval({
        agentId: AGENT_ID,
        action: "create_voucher",
        targetType: "voucher",
        targetId: transaction.id,
        payload: voucher as unknown as Record<string, unknown>,
        confidence: "H",
        rationale: `Auto-classified (GREEN): ${transaction.merchantName} → ${transaction.classification.description} (konto ${transaction.classification.accountNr}, MVA ${transaction.classification.mvaRate}%)`,
      });

      if (isBlocked(decision)) {
        result.blocked++;
        continue;
      }

      // Post to Tripletex
      await tripletexClient.createVoucher(voucher);
      result.posted++;

      await logAction({
        agentId: AGENT_ID,
        action: "voucher_posted",
        targetType: "voucher",
        targetId: transaction.id,
        outputData: voucher as unknown as Record<string, unknown>,
        confidence: "H",
        rationale: `Voucher posted: ${transaction.merchantName} kr ${Math.abs(transaction.amount)}`,
      });
    } catch (err) {
      result.errors.push({
        transactionId: transaction.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 4: Flag manual review items (YELLOW confidence)
  for (const { transaction, voucher } of batch.manualReview) {
    await logAction({
      agentId: AGENT_ID,
      action: "voucher_flagged_review",
      targetType: "voucher",
      targetId: transaction.id,
      inputData: { transaction, voucher } as unknown as Record<string, unknown>,
      confidence: "M",
      rationale: `YELLOW confidence — needs manual review: ${transaction.merchantName}`,
      g4Status: "pending",
    });
  }

  // Step 5: Escalate RED items
  for (const tx of batch.escalate) {
    await logAction({
      agentId: AGENT_ID,
      action: "transaction_escalated",
      targetType: "transaction",
      targetId: tx.id,
      inputData: tx as unknown as Record<string, unknown>,
      confidence: "L",
      rationale: `RED confidence — escalated to accountant: ${tx.merchantName}`,
      g4Status: "pending",
    });
  }

  await logAction({
    agentId: AGENT_ID,
    action: "process_batch_complete",
    targetType: "credit_card_transactions",
    outputData: result as unknown as Record<string, unknown>,
    confidence: result.errors.length === 0 ? "H" : "M",
    rationale: `Batch complete: ${result.posted} posted, ${result.manualReview} review, ${result.escalated} escalated, ${result.errors.length} errors`,
  });

  return result;
}

/**
 * Process a single credit card transaction.
 */
export async function processSingleTransaction(
  tx: BankTransaction,
  tripletexClient: { createVoucher: (body: unknown) => Promise<unknown> },
): Promise<{
  voucher: TripletexVoucher | null;
  classification: Classification | null;
  posted: boolean;
  error?: string;
}> {
  // Validate through Renvasken
  const validation = validateRecord(tx.id, tx as unknown as Record<string, unknown>, {
    source: "tripletex",
    recordType: "transaction",
  });

  if (validation.status === "dirty") {
    return {
      voucher: null,
      classification: null,
      posted: false,
      error: `Failed Renvasken: ${validation.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const classification = classifyMerchant(tx.merchantName ?? tx.description);
  const classified: ClassifiedTransaction = {
    id: tx.id,
    date: tx.date,
    merchantName: tx.merchantName ?? tx.description,
    amount: tx.amount,
    classification,
  };

  if (classification.confidence === "RED") {
    return { voucher: null, classification, posted: false, error: "RED confidence — escalated" };
  }

  const voucher = buildVoucher(classified);

  const decision = await requestG4Approval({
    agentId: AGENT_ID,
    action: "create_voucher",
    targetType: "voucher",
    targetId: tx.id,
    payload: voucher as unknown as Record<string, unknown>,
    confidence: classification.confidence === "GREEN" ? "H" : "M",
    rationale: `${classification.confidence}: ${tx.merchantName ?? tx.description} → konto ${classification.accountNr}`,
  });

  if (isBlocked(decision)) {
    return { voucher, classification, posted: false, error: "Blocked — awaiting G4 approval" };
  }

  await tripletexClient.createVoucher(voucher);
  return { voucher, classification, posted: true };
}

export { classifyMerchant, classifyBatch } from "./classifier.ts";
export { buildVoucher, buildVoucherBatch } from "./voucher-builder.ts";
