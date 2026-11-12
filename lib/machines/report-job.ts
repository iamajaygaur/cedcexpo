import { defineMachine } from "@/lib/fsm";
import type { ReportJobStatus } from "@/types/database";

export type ReportJobEvent = "START" | "SUCCEED" | "FAIL" | "RETRY";

export const reportJobMachine = defineMachine<ReportJobStatus, ReportJobEvent>({
  id: "report-job",
  initial: "generating",
  states: {
    generating: { SUCCEED: "ready", FAIL: "failed" },
    ready: { RETRY: "generating" },
    failed: { RETRY: "generating" },
  },
});
