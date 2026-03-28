/**
 * Bilagsansen — Merchant → Account classification.
 *
 * Classifies credit card/expense transactions into Norwegian chart of accounts.
 * Uses regex pattern matching against rules.json.
 */

import rules from "./rules.json" with { type: "json" };

export interface Classification {
  accountNr: number;
  description: string;
  mvaRate: number;
  confidence: "GREEN" | "YELLOW" | "RED";
  matchedRule: string | null;
}

/**
 * Classify a merchant name into account + MVA rate.
 *
 * GREEN (>90%): known pattern match → auto-queue for G4 approval
 * YELLOW (60-90%): fallback → flag for manual review
 * RED (<60%): ambiguous → escalate to accountant
 */
export function classifyMerchant(merchantName: string): Classification {
  const normalized = merchantName.toLowerCase().trim();

  for (const rule of rules.classificationRules) {
    const regex = new RegExp(rule.pattern, "i");
    if (regex.test(normalized)) {
      return {
        accountNr: rule.accountNr,
        description: rule.description,
        mvaRate: rule.mvaRate,
        confidence: "GREEN",
        matchedRule: rule.pattern,
      };
    }
  }

  // No match — use fallback
  return {
    accountNr: rules.fallback.accountNr,
    description: rules.fallback.description,
    mvaRate: rules.fallback.mvaRate,
    confidence: "YELLOW",
    matchedRule: null,
  };
}

/**
 * Classify a batch of transactions.
 */
export function classifyBatch(
  transactions: Array<{ id: string; merchantName: string; amount: number }>,
): Array<{ id: string; merchantName: string; amount: number; classification: Classification }> {
  return transactions.map((tx) => ({
    ...tx,
    classification: classifyMerchant(tx.merchantName),
  }));
}
