import type { ReportJob } from "@/types/database";

export type ReportJobRow = ReportJob & {
  generatedByName: string;
};
