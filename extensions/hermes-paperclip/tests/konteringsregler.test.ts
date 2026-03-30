import { describe, it, expect } from "vitest";
import {
  matchTransaction,
  loadKonteringsregler,
  KonteringsregelSchema,
} from "../src/agents/bilagsansen/konteringsregler.ts";
import type { Transaction, Konteringsregel } from "../src/agents/bilagsansen/konteringsregler.ts";

describe("Konteringsregler", () => {
  describe("matchTransaction", () => {
    const rules = loadKonteringsregler().rules;

    it("matches SAS flight to Reisekostnad 7140", () => {
      const txn: Transaction = { description: "SAS EUROBONUS", amount: -2500, merchantName: "SAS" };
      const matches = matchTransaction(txn, rules);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.accountNumber).toBe(7140);
      expect(matches[0].rule.category).toContain("fly");
      expect(matches[0].matchedBy).toContain("merchantKeywords");
    });

    it("matches Uber taxi to Reisekostnad 7140", () => {
      const txn: Transaction = {
        description: "UBER TRIP",
        amount: -189,
        merchantName: "Uber",
        mccCode: "4121",
      };
      const matches = matchTransaction(txn, rules);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.accountNumber).toBe(7140);
      expect(matches[0].rule.category).toContain("taxi");
    });

    it("matches Microsoft subscription to IT 6940", () => {
      const txn: Transaction = { description: "MICROSOFT 365 SUBSCRIPTION", amount: -999 };
      const matches = matchTransaction(txn, rules);
      expect(matches.length).toBeGreaterThan(0);
      const itMatch = matches.find((m) => m.rule.accountNumber === 6940);
      expect(itMatch).toBeDefined();
    });

    it("matches Telenor to Telefon 6900", () => {
      const txn: Transaction = {
        description: "Telenor faktura",
        amount: -499,
        merchantName: "Telenor",
      };
      const matches = matchTransaction(txn, rules);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.accountNumber).toBe(6900);
    });

    it("matches Circle K to Drivstoff 7000", () => {
      const txn: Transaction = {
        description: "CIRCLE K MAJORSTUEN",
        amount: -650,
        mccCode: "5541",
      };
      const matches = matchTransaction(txn, rules);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.accountNumber).toBe(7000);
    });

    it("returns empty array for unrecognized transaction", () => {
      const txn: Transaction = { description: "RANDOM XYZ CORP PAYMENT", amount: -100 };
      const matches = matchTransaction(txn, rules);
      // May have weak amount-range matches, but no keyword/MCC matches
      const strongMatches = matches.filter((m) => m.score >= 20);
      expect(strongMatches.length).toBe(0);
    });

    it("ranks matches by score (highest first)", () => {
      // A transaction that could match multiple categories
      const txn: Transaction = { description: "Scandic Hotel restaurant middag", amount: -1200 };
      const matches = matchTransaction(txn, rules);
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it("handles ambiguous transaction with multiple matches", () => {
      // Restaurant meal could be representasjon or personal
      const txn: Transaction = {
        description: "Restaurant Oslo middag",
        amount: -800,
        mccCode: "5812",
      };
      const matches = matchTransaction(txn, rules);
      expect(matches.length).toBeGreaterThan(0);
      // Should find representasjon
      const repMatch = matches.find((m) => m.rule.category === "Representasjon");
      expect(repMatch).toBeDefined();
      expect(repMatch!.rule.requiresReview).toBe(true);
    });
  });

  describe("loadKonteringsregler", () => {
    it("loads default rules when no YAML file provided", () => {
      const ruleSet = loadKonteringsregler("/nonexistent/path.yaml");
      expect(ruleSet.version).toBe("0.1.0");
      expect(ruleSet.rules.length).toBe(17);
    });

    it("loads rules from YAML file", () => {
      const ruleSet = loadKonteringsregler();
      expect(ruleSet.rules.length).toBe(17);
      // Verify first rule structure
      expect(ruleSet.rules[0].id).toBe("KR-001");
      expect(ruleSet.rules[0].accountNumber).toBe(7140);
    });

    it("all default rules pass Zod validation", () => {
      const ruleSet = loadKonteringsregler();
      for (const rule of ruleSet.rules) {
        expect(() => KonteringsregelSchema.parse(rule)).not.toThrow();
      }
    });

    it("all rules have unique IDs", () => {
      const ruleSet = loadKonteringsregler();
      const ids = ruleSet.rules.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("edge cases", () => {
    it("handles empty description gracefully", () => {
      const rules = loadKonteringsregler().rules;
      const txn: Transaction = { description: "", amount: 0 };
      const matches = matchTransaction(txn, rules);
      // Should not crash; may have zero matches or only weak amount-range matches
      expect(Array.isArray(matches)).toBe(true);
    });

    it("handles special characters in description", () => {
      const rules = loadKonteringsregler().rules;
      const txn: Transaction = { description: "Spëcial (chars) [test] {regex}", amount: -100 };
      const matches = matchTransaction(txn, rules);
      expect(Array.isArray(matches)).toBe(true);
    });
  });
});
