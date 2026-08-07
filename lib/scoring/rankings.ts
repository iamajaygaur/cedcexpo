/**
 * Ranking / scoring helpers — submitted evaluations only.
 * Ties share the same rank (competition ranking: 1, 2, 2, 4).
 *
 * Final team score (dual color-group evaluation):
 *   1. Each judge scores /50 (sum of criterion scores).
 *   2. Per assigned color group: average of that group's judges.
 *   3. Final = average of the two group averages (equal weight per group).
 */

export function competitionRank(
  sortedDescendingScores: readonly number[],
): number[] {
  const ranks: number[] = [];
  let i = 0;
  while (i < sortedDescendingScores.length) {
    const score = sortedDescendingScores[i]!;
    const rank = i + 1;
    let j = i;
    while (
      j < sortedDescendingScores.length &&
      nearlyEqual(sortedDescendingScores[j]!, score)
    ) {
      ranks[j] = rank;
      j += 1;
    }
    i = j;
  }
  return ranks;
}

export function nearlyEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}

export function weightedEvaluationTotal(
  scores: readonly { score: number; weight: number }[],
): number {
  return scores.reduce(
    (sum, row) =>
      sum +
      (Number.isFinite(row.score) && Number.isFinite(row.weight)
        ? row.score * row.weight
        : 0),
    0,
  );
}

export function maxWeightedTotal(
  criteria: readonly { max_score: number; weight: number }[],
): number {
  return criteria.reduce(
    (sum, c) =>
      sum +
      (Number.isFinite(c.max_score) && Number.isFinite(c.weight)
        ? Number(c.max_score) * Number(c.weight)
        : 0),
    0,
  );
}

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export type DualGroupAverage = {
  groupId: string;
  average: number;
  judgeCount: number;
};

export type DualGroupFinalScore = {
  /** Mean of per-group averages (groups weighted equally). */
  finalScore: number;
  groupAverages: DualGroupAverage[];
  /** Total submitted judge evaluations counted. */
  evaluationCount: number;
};

/**
 * Dual color-group final score.
 * Requires at least one submitted total for every assigned group.
 * Groups with unequal judge counts are weighted equally in the final.
 */
export function dualGroupFinalScore(params: {
  assignedGroupIds: readonly string[];
  /** groupId → each judge's evaluation total for this team */
  totalsByGroup: ReadonlyMap<string, readonly number[]>;
}): DualGroupFinalScore | null {
  const assigned = Array.from(new Set(params.assignedGroupIds));
  if (assigned.length === 0) return null;

  const groupAverages: DualGroupAverage[] = [];
  let evaluationCount = 0;

  for (const groupId of assigned) {
    const totals = params.totalsByGroup.get(groupId) ?? [];
    const groupAvg = average(totals);
    if (groupAvg == null) {
      // Missing a group average — not a complete dual evaluation yet.
      return null;
    }
    groupAverages.push({
      groupId,
      average: groupAvg,
      judgeCount: totals.length,
    });
    evaluationCount += totals.length;
  }

  const finalScore = average(groupAverages.map((g) => g.average));
  if (finalScore == null) return null;

  return { finalScore, groupAverages, evaluationCount };
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const escape = (cell: string | number | null | undefined) => {
    const raw = cell == null ? "" : String(cell);
    if (/[",\n\r]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}
