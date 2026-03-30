import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

/**
 * Konteringsregler — Norwegian accounting classification rules for Bilagsansen.
 *
 * Maps transactions to account numbers, VAT codes, and categories
 * using merchant keywords, MCC codes, amount ranges, and description patterns.
 *
 * DOMAIN REVIEW NEEDED: These are starter rules based on common Norwegian
 * accounting patterns. A certified accountant must review and extend them
 * before production use.
 */

// --- Layer 0: Schemas ---

export const MatchPatternsSchema = z.object({
  merchantKeywords: z.array(z.string()).optional(),
  mccCodes: z.array(z.string()).optional(),
  amountRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  descriptionPatterns: z.array(z.string()).optional(),
});
export type MatchPatterns = z.infer<typeof MatchPatternsSchema>;

export const KonteringsregelSchema = z.object({
  id: z.string(),
  category: z.string(),
  accountNumber: z.number(),
  accountName: z.string(),
  vatCode: z.number(),
  vatDescription: z.string().optional(),
  matchPatterns: MatchPatternsSchema,
  confidence: z.enum(["high", "medium", "low"]),
  requiresReview: z.boolean(),
  source: z.enum(["manual", "tripletex_config", "domain_expert"]),
  notes: z.string().optional(),
});
export type Konteringsregel = z.infer<typeof KonteringsregelSchema>;

export const KonteringsreglerSetSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  rules: z.array(KonteringsregelSchema),
});
export type KonteringsreglerSet = z.infer<typeof KonteringsreglerSetSchema>;

// --- Layer 1: Transaction matching ---

export interface Transaction {
  description: string;
  amount: number;
  merchantName?: string;
  mccCode?: string;
  date?: string;
}

export interface MatchResult {
  rule: Konteringsregel;
  score: number; // 0-100 match confidence
  matchedBy: string[]; // which pattern types matched
}

/**
 * Match a transaction against a set of konteringsregler.
 * Returns matches ranked by score (highest first).
 */
export function matchTransaction(txn: Transaction, rules: Konteringsregel[]): MatchResult[] {
  const results: MatchResult[] = [];

  for (const rule of rules) {
    const { score, matchedBy } = scoreMatch(txn, rule);
    if (score > 0) {
      results.push({ rule, score, matchedBy });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function scoreMatch(
  txn: Transaction,
  rule: Konteringsregel,
): { score: number; matchedBy: string[] } {
  let score = 0;
  const matchedBy: string[] = [];
  const patterns = rule.matchPatterns;

  // Keyword matching (strongest signal)
  if (patterns.merchantKeywords && patterns.merchantKeywords.length > 0) {
    const text = `${txn.description} ${txn.merchantName ?? ""}`.toLowerCase();
    const matched = patterns.merchantKeywords.some((kw) => text.includes(kw.toLowerCase()));
    if (matched) {
      score += 40;
      matchedBy.push("merchantKeywords");
    }
  }

  // MCC code matching (very strong signal)
  if (patterns.mccCodes && patterns.mccCodes.length > 0 && txn.mccCode) {
    if (patterns.mccCodes.includes(txn.mccCode)) {
      score += 35;
      matchedBy.push("mccCodes");
    }
  }

  // Description pattern matching (regex)
  if (patterns.descriptionPatterns && patterns.descriptionPatterns.length > 0) {
    const text = txn.description;
    const matched = patterns.descriptionPatterns.some((p) => {
      try {
        return new RegExp(p, "i").test(text);
      } catch {
        return false;
      }
    });
    if (matched) {
      score += 25;
      matchedBy.push("descriptionPatterns");
    }
  }

  // Amount range matching (weak signal, mostly for filtering)
  if (patterns.amountRange) {
    const absAmount = Math.abs(txn.amount);
    const { min, max } = patterns.amountRange;
    const inRange =
      (min === undefined || absAmount >= min) && (max === undefined || absAmount <= max);
    if (inRange) {
      score += 10;
      matchedBy.push("amountRange");
    }
  }

  // Apply rule confidence modifier
  const confidenceModifier =
    rule.confidence === "high" ? 1.0 : rule.confidence === "medium" ? 0.8 : 0.6;
  score = Math.round(score * confidenceModifier);

  return { score, matchedBy };
}

// --- Layer 2: Rule loading ---

/**
 * Load konteringsregler from a YAML file, falling back to embedded defaults.
 */
export function loadKonteringsregler(yamlPath?: string): KonteringsreglerSet {
  const defaultPath = resolve(import.meta.dirname, "../../../data/konteringsregler.yaml");
  const path = yamlPath ?? defaultPath;

  if (existsSync(path)) {
    const content = readFileSync(path, "utf-8");
    const parsed = parseYaml(content);
    return KonteringsreglerSetSchema.parse(parsed);
  }

  return KonteringsreglerSetSchema.parse({
    version: "0.1.0",
    lastUpdated: "2026-03-30",
    rules: DEFAULT_RULES,
  });
}

// --- Layer 3: Default rules ---
// DOMAIN REVIEW NEEDED: These rules cover common Norwegian accounting patterns.
// A certified accountant should verify account numbers, VAT codes, and matching logic.

const DEFAULT_RULES: Konteringsregel[] = [
  {
    id: "KR-001",
    category: "Reise — fly",
    accountNumber: 7140,
    accountName: "Reisekostnad",
    vatCode: 0,
    vatDescription: "Ingen MVA (transport)",
    matchPatterns: {
      merchantKeywords: ["sas", "norwegian", "wideroe", "widerøe", "flyr", "ryanair", "easyjet"],
      mccCodes: ["3000", "3001", "3002", "3003", "4511"],
      descriptionPatterns: ["\\bfly\\b", "\\bflight\\b", "\\bairline\\b"],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-002",
    category: "Reise — hotell",
    accountNumber: 7140,
    accountName: "Reisekostnad",
    vatCode: 11,
    vatDescription: "12% MVA (overnatting)",
    matchPatterns: {
      merchantKeywords: [
        "hotel",
        "hotell",
        "scandic",
        "thon",
        "comfort",
        "clarion",
        "radisson",
        "booking.com",
        "airbnb",
      ],
      mccCodes: ["7011"],
      descriptionPatterns: ["\\bhotell?\\b", "\\bovernatting\\b", "\\baccommodation\\b"],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-003",
    category: "Reise — taxi",
    accountNumber: 7140,
    accountName: "Reisekostnad",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: ["taxi", "uber", "bolt", "oslo taxi", "norgestaxi"],
      mccCodes: ["4121"],
      descriptionPatterns: ["\\btaxi\\b", "\\buber\\b"],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-004",
    category: "Reise — tog/buss",
    accountNumber: 7140,
    accountName: "Reisekostnad",
    vatCode: 0,
    vatDescription: "Ingen MVA (kollektiv)",
    matchPatterns: {
      merchantKeywords: ["vy", "ruter", "entur", "kolumbus", "atb", "skyss", "flybussen"],
      mccCodes: ["4011", "4111", "4112"],
      descriptionPatterns: ["\\btog\\b", "\\btrain\\b", "\\bbuss\\b", "\\bbus\\b"],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-005",
    category: "Representasjon",
    accountNumber: 7350,
    accountName: "Representasjon",
    vatCode: 0,
    vatDescription: "Ingen MVA-fradrag (representasjon)",
    matchPatterns: {
      merchantKeywords: ["restaurant", "eatery", "brasserie", "bistro"],
      mccCodes: ["5812", "5813", "5814"],
      descriptionPatterns: ["\\brepresentasjon\\b", "\\bmiddag\\b", "\\blunsj\\b"],
      amountRange: { min: 500 },
    },
    confidence: "medium",
    requiresReview: true,
    source: "manual",
    notes:
      "Amounts over NOK 500 at restaurants likely representasjon; requires review for personal vs business",
  },
  {
    id: "KR-006",
    category: "Kontorrekvisita",
    accountNumber: 6540,
    accountName: "Inventar og utstyr",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: ["staples", "clas ohlson", "jula", "biltema", "panduro", "kontorland"],
      mccCodes: ["5943", "5944"],
      descriptionPatterns: ["\\bkontor\\b", "\\boffice\\b", "\\brekvisita\\b"],
    },
    confidence: "medium",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-007",
    category: "IT — programvare/abonnement",
    accountNumber: 6940,
    accountName: "IT-kostnader og programvare",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: [
        "microsoft",
        "google",
        "apple",
        "adobe",
        "slack",
        "notion",
        "github",
        "aws",
        "azure",
        "dropbox",
        "zoom",
        "atlassian",
      ],
      mccCodes: ["5734", "5817", "7372"],
      descriptionPatterns: [
        "\\bsubscription\\b",
        "\\babonnement\\b",
        "\\bsoftware\\b",
        "\\blisens\\b",
      ],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-008",
    category: "Telefon/data",
    accountNumber: 6900,
    accountName: "Telefon og datakommunikasjon",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: [
        "telenor",
        "telia",
        "ice",
        "phonero",
        "mycall",
        "chili mobil",
        "altibox",
        "get",
      ],
      mccCodes: ["4812", "4813", "4814"],
      descriptionPatterns: ["\\btelefon\\b", "\\bmobil\\b", "\\binternet\\b", "\\bbredband\\b"],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-009",
    category: "Drivstoff",
    accountNumber: 7000,
    accountName: "Drivstoff",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: ["circle k", "esso", "shell", "uno-x", "best", "st1", "yx"],
      mccCodes: ["5541", "5542"],
      descriptionPatterns: [
        "\\bbensin\\b",
        "\\bdiesel\\b",
        "\\bfuel\\b",
        "\\bdrivstoff\\b",
        "\\blading\\b",
      ],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-010",
    category: "Parkering",
    accountNumber: 7080,
    accountName: "Bilkostnader",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: ["easypark", "apcoa", "europark", "onepark", "q-park"],
      mccCodes: ["7523"],
      descriptionPatterns: ["\\bparkering\\b", "\\bparking\\b"],
    },
    confidence: "high",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-011",
    category: "Porto/frakt",
    accountNumber: 7040,
    accountName: "Porto og frakt",
    vatCode: 0,
    vatDescription: "Ingen MVA (posttjenester)",
    matchPatterns: {
      merchantKeywords: ["posten", "postnord", "bring", "dhl", "ups", "fedex"],
      mccCodes: ["4215", "5962"],
      descriptionPatterns: ["\\bporto\\b", "\\bfrakt\\b", "\\bshipping\\b", "\\bpakke\\b"],
    },
    confidence: "medium",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-012",
    category: "Forsikring",
    accountNumber: 7500,
    accountName: "Forsikringskostnad",
    vatCode: 0,
    vatDescription: "Ingen MVA (forsikring)",
    matchPatterns: {
      merchantKeywords: ["if ", "gjensidige", "tryg", "storebrand", "fremtind", "codan", "eika"],
      mccCodes: ["6300"],
      descriptionPatterns: ["\\bforsikring\\b", "\\binsurance\\b"],
    },
    confidence: "medium",
    requiresReview: true,
    source: "manual",
    notes: "Verify insurance type — some are employee benefits (different account)",
  },
  {
    id: "KR-013",
    category: "Faglitteratur/kurs",
    accountNumber: 6860,
    accountName: "Kurs og faglig oppdatering",
    vatCode: 0,
    vatDescription: "Ingen MVA (undervisning)",
    matchPatterns: {
      merchantKeywords: ["akademika", "norli", "adlibris", "udemy", "coursera", "fagbokforlaget"],
      mccCodes: ["5942", "8299"],
      descriptionPatterns: [
        "\\bkurs\\b",
        "\\bcourse\\b",
        "\\bkonferanse\\b",
        "\\bseminar\\b",
        "\\bbok\\b",
      ],
    },
    confidence: "medium",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-014",
    category: "Renhold/vedlikehold",
    accountNumber: 6390,
    accountName: "Renhold og vedlikehold",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: ["iss", "coor", "renholdsverket"],
      mccCodes: ["7349"],
      descriptionPatterns: [
        "\\brendhold\\b",
        "\\bvedlikehold\\b",
        "\\bcleaning\\b",
        "\\bmaintenance\\b",
      ],
    },
    confidence: "medium",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-015",
    category: "Reklame/markedsføring",
    accountNumber: 7330,
    accountName: "Reklame og markedsføring",
    vatCode: 1,
    vatDescription: "25% MVA",
    matchPatterns: {
      merchantKeywords: ["facebook", "meta", "google ads", "linkedin", "instagram", "tiktok"],
      mccCodes: ["7311", "7312"],
      descriptionPatterns: [
        "\\breklame\\b",
        "\\bannons\\b",
        "\\bads\\b",
        "\\bmarketing\\b",
        "\\bkampanje\\b",
      ],
    },
    confidence: "medium",
    requiresReview: false,
    source: "manual",
  },
  {
    id: "KR-016",
    category: "Husleie",
    accountNumber: 6300,
    accountName: "Husleie",
    vatCode: 6,
    vatDescription: "Avgiftsfritt utleie (med frivillig registrering: 25% MVA)",
    matchPatterns: {
      descriptionPatterns: ["\\bhusleie\\b", "\\bleie\\b.*\\blokal", "\\brent\\b"],
    },
    confidence: "low",
    requiresReview: true,
    source: "manual",
    notes: "VAT depends on whether landlord is voluntarily registered for MVA; always review",
  },
  {
    id: "KR-017",
    category: "Gaver til ansatte",
    accountNumber: 5990,
    accountName: "Annen personalkostnad",
    vatCode: 0,
    vatDescription: "Ingen MVA-fradrag (personalytelse)",
    matchPatterns: {
      descriptionPatterns: ["\\bgave\\b", "\\bjulegave\\b", "\\bbursdag\\b"],
      amountRange: { max: 5000 },
    },
    confidence: "low",
    requiresReview: true,
    source: "manual",
    notes: "Tax-free gift limit: NOK 5,000/year. Amounts above require income reporting.",
  },
];
