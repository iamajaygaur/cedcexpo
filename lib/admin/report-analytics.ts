import type {
  CriterionAverageRow,
  ResultsBundle,
  TeamRankingRow,
} from "@/lib/admin/results-data";

/** Buckets match the Reports mock: <50, 50-60, …, 90+ */
export const SCORE_BUCKETS = [
  { key: "lt50", label: "< 50", min: 0, max: 49.999 },
  { key: "50-60", label: "50-60", min: 50, max: 60 },
  { key: "60-70", label: "60-70", min: 60, max: 70 },
  { key: "70-80", label: "70-80", min: 70, max: 80 },
  { key: "80-90", label: "80-90", min: 80, max: 90 },
  { key: "90-plus", label: "90+", min: 90, max: 100 },
] as const;

export type ScoreBucketKey = (typeof SCORE_BUCKETS)[number]["key"];

export type ScoreDistributionBucket = {
  key: ScoreBucketKey;
  label: string;
  count: number;
};

export type DeptBreakdownSlice = {
  category: string;
  teamCount: number;
  evaluatedCount: number;
  averagePercent: number;
  /** Share of evaluated teams (0–100). */
  sharePercent: number;
};

export type CriterionBar = {
  name: string;
  averageScore: number;
  maxScore: number;
  percent: number;
  sampleCount: number;
};

export type ReportAnalytics = {
  scoreDistribution: ScoreDistributionBucket[];
  maxDistributionCount: number;
  deptBreakdown: DeptBreakdownSlice[];
  totalEvaluatedTeams: number;
  totalTeams: number;
  /** Mean final % across evaluated teams. */
  averagePercent: number;
  /** Highest team final %. */
  topPercent: number;
  /** Evaluated teams / all teams in filter (0–100). */
  evaluationCoveragePercent: number;
  criterionBars: CriterionBar[];
};

function bucketForPercent(percent: number): ScoreBucketKey {
  const p = Math.max(0, Math.min(100, percent));
  if (p < 50) return "lt50";
  if (p < 60) return "50-60";
  if (p < 70) return "60-70";
  if (p < 80) return "70-80";
  if (p < 90) return "80-90";
  return "90-plus";
}

function rankingHasScores(row: TeamRankingRow): boolean {
  return row.evaluationCount > 0;
}

function buildCriterionBars(rows: CriterionAverageRow[]): CriterionBar[] {
  return rows
    .map((row) => {
      const maxScore = Number(row.criterion.max_score) || 10;
      const averageScore = row.averageScore;
      return {
        name: row.criterion.name,
        averageScore,
        maxScore,
        percent: maxScore > 0 ? (averageScore / maxScore) * 100 : 0,
        sampleCount: row.sampleCount,
      };
    })
    .filter((b) => b.sampleCount > 0);
}

export function buildReportAnalytics(bundle: ResultsBundle): ReportAnalytics {
  const evaluated = bundle.rankings.filter(rankingHasScores);
  const totalTeams = bundle.rankings.length;

  const counts = Object.fromEntries(
    SCORE_BUCKETS.map((b) => [b.key, 0]),
  ) as Record<ScoreBucketKey, number>;

  for (const row of evaluated) {
    counts[bucketForPercent(row.averagePercent)] += 1;
  }

  const scoreDistribution = SCORE_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: counts[bucket.key],
  }));

  const maxDistributionCount = Math.max(
    1,
    ...scoreDistribution.map((b) => b.count),
  );

  const byCategory = new Map<
    string,
    { teamCount: number; evaluated: TeamRankingRow[] }
  >();

  for (const row of bundle.rankings) {
    const category = row.team.category?.trim() || "Uncategorized";
    const existing = byCategory.get(category) ?? {
      teamCount: 0,
      evaluated: [],
    };
    existing.teamCount += 1;
    if (rankingHasScores(row)) {
      existing.evaluated.push(row);
    }
    byCategory.set(category, existing);
  }

  const evaluatedTotal = Math.max(1, evaluated.length);

  const deptBreakdown: DeptBreakdownSlice[] = [...byCategory.entries()]
    .map(([category, data]) => {
      const avg =
        data.evaluated.length === 0
          ? 0
          : data.evaluated.reduce((sum, r) => sum + r.averagePercent, 0) /
            data.evaluated.length;
      return {
        category,
        teamCount: data.teamCount,
        evaluatedCount: data.evaluated.length,
        averagePercent: avg,
        sharePercent: (data.evaluated.length / evaluatedTotal) * 100,
      };
    })
    .sort(
      (a, b) =>
        b.evaluatedCount - a.evaluatedCount ||
        a.category.localeCompare(b.category),
    );

  const averagePercent =
    evaluated.length === 0
      ? 0
      : evaluated.reduce((sum, r) => sum + r.averagePercent, 0) /
        evaluated.length;

  const topPercent =
    evaluated.length === 0
      ? 0
      : Math.max(...evaluated.map((r) => r.averagePercent));

  const evaluationCoveragePercent =
    totalTeams === 0 ? 0 : (evaluated.length / totalTeams) * 100;

  return {
    scoreDistribution,
    maxDistributionCount,
    deptBreakdown,
    totalEvaluatedTeams: evaluated.length,
    totalTeams,
    averagePercent,
    topPercent,
    evaluationCoveragePercent,
    criterionBars: buildCriterionBars(bundle.criterionAverages),
  };
}
