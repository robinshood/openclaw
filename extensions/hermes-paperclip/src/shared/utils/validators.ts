/**
 * Common validators for the Hermes × Paperclip system.
 */

/** Norwegian org number: exactly 9 digits */
export function isValidOrgNumber(orgNumber: string): boolean {
  return /^\d{9}$/.test(orgNumber);
}

/** Confidence must be 0-100 */
export function isValidConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 100;
}

/** Criterion weights must sum to 1.0 (within tolerance) */
export function weightsSum(weights: number[], tolerance = 0.001): boolean {
  const sum = weights.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < tolerance;
}

/** Score must be between 1 and 5 (decision matrix scale) */
export function isValidScore(score: number): boolean {
  return score >= 1 && score <= 5;
}

/** Checks if a date string is within the last N days (default: 30 for stale data check) */
export function isWithinDays(dateStr: string, days = 30): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}
