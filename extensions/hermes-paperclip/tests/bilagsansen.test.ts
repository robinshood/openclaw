/**
 * Bilagsansen — Credit card voucher automation tests.
 */
import { describe, expect, it } from "vitest";
import { classifyMerchant, classifyBatch } from "../src/agents/bilagsansen/classifier.ts";
import {
  buildVoucher,
  buildVoucherBatch,
  type ClassifiedTransaction,
} from "../src/agents/bilagsansen/voucher-builder.ts";

// --- Classifier ---

describe("Bilagsansen Classifier", () => {
  it("classifies airline as travel (konto 7140, MVA 0)", () => {
    const result = classifyMerchant("SAS Eurobonus");
    expect(result.accountNr).toBe(7140);
    expect(result.mvaRate).toBe(0);
    expect(result.confidence).toBe("GREEN");
    expect(result.description).toBe("Reisekostnad");
  });

  it("classifies restaurant as representation (konto 7100, MVA 25)", () => {
    const result = classifyMerchant("Restaurant Lofoten");
    expect(result.accountNr).toBe(7100);
    expect(result.mvaRate).toBe(25);
    expect(result.confidence).toBe("GREEN");
  });

  it("classifies taxi as travel (MVA 25)", () => {
    const result = classifyMerchant("Uber Trip");
    expect(result.accountNr).toBe(7140);
    expect(result.mvaRate).toBe(25);
    expect(result.confidence).toBe("GREEN");
  });

  it("classifies hotel as travel (MVA 12)", () => {
    const result = classifyMerchant("Scandic Hotels Oslo");
    expect(result.accountNr).toBe(7140);
    expect(result.mvaRate).toBe(12);
    expect(result.confidence).toBe("GREEN");
  });

  it("classifies fuel as drivstoff (konto 7000)", () => {
    const result = classifyMerchant("Circle K Stasjonen");
    expect(result.accountNr).toBe(7000);
    expect(result.confidence).toBe("GREEN");
  });

  it("classifies office supplies as inventar (konto 6540)", () => {
    const result = classifyMerchant("Elkjøp Business");
    expect(result.accountNr).toBe(6540);
    expect(result.confidence).toBe("GREEN");
  });

  it("falls back to YELLOW for unknown merchant", () => {
    const result = classifyMerchant("Completely Unknown Corp ABC");
    expect(result.accountNr).toBe(7700);
    expect(result.confidence).toBe("YELLOW");
    expect(result.matchedRule).toBeNull();
  });

  it("is case-insensitive", () => {
    const result = classifyMerchant("NORWEGIAN AIR SHUTTLE");
    expect(result.accountNr).toBe(7140);
    expect(result.confidence).toBe("GREEN");
  });

  it("classifies a batch", () => {
    const batch = classifyBatch([
      { id: "1", merchantName: "SAS", amount: -1000 },
      { id: "2", merchantName: "Unknown", amount: -500 },
    ]);
    expect(batch).toHaveLength(2);
    expect(batch[0].classification.confidence).toBe("GREEN");
    expect(batch[1].classification.confidence).toBe("YELLOW");
  });
});

// --- Voucher Builder ---

describe("Bilagsansen Voucher Builder", () => {
  const greenTx: ClassifiedTransaction = {
    id: "tx-001",
    date: "2026-03-15",
    merchantName: "SAS Eurobonus",
    amount: -1250,
    classification: {
      accountNr: 7140,
      description: "Reisekostnad",
      mvaRate: 0,
      confidence: "GREEN",
      matchedRule: "SAS|Norwegian",
    },
  };

  it("builds a voucher with two postings", () => {
    const voucher = buildVoucher(greenTx);
    expect(voucher.postings).toHaveLength(2);
    expect(voucher.date).toBe("2026-03-15");
    expect(voucher.description).toContain("SAS Eurobonus");
  });

  it("uses absolute amounts for debit posting", () => {
    const voucher = buildVoucher(greenTx);
    expect(voucher.postings[0].amount).toBe(1250);
    expect(voucher.postings[0].accountId).toBe(7140);
  });

  it("counter-posts to account 2900 (credit card liability)", () => {
    const voucher = buildVoucher(greenTx);
    expect(voucher.postings[1].amount).toBe(-1250);
    expect(voucher.postings[1].accountId).toBe(2900);
  });

  it("sets VAT code on expense posting", () => {
    const voucher = buildVoucher(greenTx);
    expect(voucher.postings[0].vatCode).toBe(0);
  });

  it("separates batch into auto/manual/escalate queues", () => {
    const yellowTx: ClassifiedTransaction = {
      ...greenTx,
      id: "tx-002",
      classification: { ...greenTx.classification, confidence: "YELLOW" },
    };
    const redTx: ClassifiedTransaction = {
      ...greenTx,
      id: "tx-003",
      classification: { ...greenTx.classification, confidence: "RED" },
    };

    const result = buildVoucherBatch([greenTx, yellowTx, redTx]);
    expect(result.autoApprove).toHaveLength(1);
    expect(result.manualReview).toHaveLength(1);
    expect(result.escalate).toHaveLength(1);
  });

  it("does not build vouchers for RED transactions", () => {
    const redTx: ClassifiedTransaction = {
      ...greenTx,
      id: "tx-red",
      classification: { ...greenTx.classification, confidence: "RED" },
    };
    const result = buildVoucherBatch([redTx]);
    expect(result.escalate).toHaveLength(1);
    expect(result.autoApprove).toHaveLength(0);
    expect(result.manualReview).toHaveLength(0);
  });
});
