/**
 * Scoring utilities — server-side totals only (Phase 6/9).
 * Never trust client-submitted totals.
 */

export function clampScore(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore)) {
    return 0;
  }
  return Math.min(maxScore, Math.max(0, score));
}

export function sumScores(scores: readonly number[]): number {
  return scores.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
}
