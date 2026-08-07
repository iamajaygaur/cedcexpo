import type { ReportType } from "@/types/database";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  master: "Master Report",
  rankings: "Team Rankings",
  criteria: "Criterion Averages",
  abet: "ABET Outcomes",
  judges: "Judge Completion",
};
