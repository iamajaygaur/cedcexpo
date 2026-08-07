"use client";

import { useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { showAppFeedbackFromResult } from "@/components/shared/app-feedback";
import { importJudgesAction } from "@/lib/admin/actions/judges";
import {
  buildJudgeImportTemplateCsv,
  detectCsvDelimiter,
  parseCsvText,
  parseImportedJudgeRecords,
  recordsFromCsvMatrix,
  recordsFromSheetMatrix,
  type ImportedJudge,
  type JudgeImportRowError,
} from "@/lib/admin/judge-import";
import { cn } from "@/lib/utils";

type JudgesImportDialogProps = {
  eventId: string | null;
  groupNames: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "partial"; message: string };

async function parseFile(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    const delimiter = detectCsvDelimiter(text);
    return recordsFromCsvMatrix(parseCsvText(text, delimiter));
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | null>>(
      sheet,
      {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      },
    );
    return recordsFromSheetMatrix(matrix);
  }

  throw new Error("Use a .csv or .xlsx file.");
}

function downloadTemplate() {
  const csv = buildJudgeImportTemplateCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cedc-judges-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const PREVIEW_PAGE_SIZE = 15;

export function JudgesImportDialog({
  eventId,
  groupNames,
  open,
  onOpenChange,
  onImported,
}: JudgesImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRecords, setRawRecords] = useState<Record<string, string>[]>([]);
  const [judges, setJudges] = useState<ImportedJudge[]>([]);
  const [errors, setErrors] = useState<JudgeImportRowError[]>([]);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle" });
  const [failed, setFailed] = useState<
    Array<{ username: string; message: string }>
  >([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [pending, startTransition] = useTransition();

  const previewTotalPages = Math.max(
    1,
    Math.ceil(judges.length / PREVIEW_PAGE_SIZE),
  );
  const previewCurrentPage = Math.min(previewPage, previewTotalPages);
  const previewStart = (previewCurrentPage - 1) * PREVIEW_PAGE_SIZE;
  const previewJudges = judges.slice(
    previewStart,
    previewStart + PREVIEW_PAGE_SIZE,
  );

  function applyParsed(
    records: Record<string, string>[],
    passwordDefault: string,
  ) {
    const parsed = parseImportedJudgeRecords(records, {
      defaultPassword: passwordDefault,
    });
    setJudges(parsed.judges);
    setErrors(parsed.errors);
    setPreviewPage(1);
    if (parsed.judges.length === 0 && parsed.errors.length === 0) {
      setStatus({
        kind: "error",
        message:
          "Import failed: no judge rows found. Check the header row matches the template.",
      });
    } else if (parsed.judges.length === 0 && parsed.errors.length > 0) {
      setStatus({
        kind: "error",
        message: `Import failed: ${parsed.errors.length} row error${parsed.errors.length === 1 ? "" : "s"} — fix the file and try again.`,
      });
    } else {
      setStatus({ kind: "idle" });
    }
  }

  function resetLocal() {
    setFileName(null);
    setRawRecords([]);
    setJudges([]);
    setErrors([]);
    setDefaultPassword("");
    setStatus({ kind: "idle" });
    setFailed([]);
    setPreviewPage(1);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFileChange(file: File | null) {
    setStatus({ kind: "idle" });
    setFailed([]);
    if (!file) {
      resetLocal();
      return;
    }
    try {
      const records = await parseFile(file);
      setFileName(file.name);
      setRawRecords(records);
      applyParsed(records, defaultPassword);
    } catch (e) {
      resetLocal();
      setStatus({
        kind: "error",
        message:
          e instanceof Error
            ? `Import failed: ${e.message}`
            : "Import failed: could not read file.",
      });
    }
  }

  function onDefaultPasswordChange(value: string) {
    setDefaultPassword(value);
    if (rawRecords.length > 0) {
      setFailed([]);
      applyParsed(rawRecords, value);
    }
  }

  function runImport() {
    if (judges.length === 0) return;
    startTransition(async () => {
      const result = await importJudgesAction({
        eventId,
        judgesJson: JSON.stringify(judges),
      });
      setFailed(result.failed ?? []);

      if (!result.ok) {
        setStatus({
          kind: "error",
          message: result.message ?? "Import failed.",
        });
        return;
      }

      const hasFailures = (result.failed?.length ?? 0) > 0;
      if (hasFailures) {
        setStatus({
          kind: "partial",
          message: result.message ?? "Import partially successful.",
        });
        onImported?.();
        window.setTimeout(() => {
          showAppFeedbackFromResult(
            true,
            result.message ?? "Judges imported with some failures.",
          );
        }, 0);
        return;
      }

      onImported?.();
      resetLocal();
      onOpenChange(false);
      window.setTimeout(() => {
        showAppFeedbackFromResult(
          true,
          result.message ?? "Judges imported successfully.",
        );
      }, 0);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetLocal();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-4 overflow-hidden p-6 sm:max-w-5xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import judges</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file using the template headers. Each row
            creates a new judge account (username = first+last name). Optional{" "}
            <strong>Group</strong> must match an event group
            {groupNames.length > 0
              ? `: ${groupNames.join(", ")}`
              : " (select an event with groups to assign)"}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={downloadTemplate}
            >
              <Download className="size-4" aria-hidden />
              Download template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="judge-import-default-password">
              Default temporary password (optional)
            </Label>
            <PasswordInput
              id="judge-import-default-password"
              value={defaultPassword}
              onChange={(e) => onDefaultPasswordChange(e.target.value)}
              placeholder="Used when a row omits Temporary Password"
              autoComplete="new-password"
            />
          </div>

          {fileName ? (
            <p className="text-sm text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground">{fileName}</span>
              {" · "}
              {judges.length} judge{judges.length === 1 ? "" : "s"} ready to
              import
              {errors.length > 0
                ? ` · ${errors.length} row${errors.length === 1 ? "" : "s"} skipped (errors below)`
                : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Headers: First Name, Last Name, Temporary Password, Organization,
              Department, Notes, Active, Group
            </p>
          )}

          {status.kind !== "idle" ? (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                status.kind === "success" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-900",
                status.kind === "partial" &&
                  "border-amber-200 bg-amber-50 text-amber-950",
                status.kind === "error" &&
                  "border-rose-200 bg-rose-50 text-rose-900",
              )}
              role="status"
            >
              {status.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <p className="font-medium">{status.message}</p>
            </div>
          ) : null}

          <div className="grid min-h-0 gap-4 lg:grid-cols-2">
            {errors.length > 0 ? (
              <div className="flex max-h-[min(50vh,420px)] flex-col overflow-hidden rounded-md border border-rose-200 bg-rose-50 text-sm text-rose-900 lg:max-h-[min(56vh,520px)]">
                <p className="shrink-0 border-b border-rose-200/80 px-3 py-2 font-semibold">
                  Row errors ({errors.length} skipped)
                </p>
                <ul className="list-disc space-y-1.5 overflow-y-auto px-3 py-2 pl-7">
                  {errors.map((err) => (
                    <li
                      key={`${err.row}-${err.message}`}
                      className="break-words"
                    >
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {judges.length > 0 ? (
              <div
                className={cn(
                  "flex flex-col overflow-hidden rounded-md border border-border bg-muted/40 text-sm",
                  errors.length === 0 && "lg:col-span-2",
                )}
              >
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {previewStart + 1} to{" "}
                    {Math.min(
                      previewStart + PREVIEW_PAGE_SIZE,
                      judges.length,
                    )}{" "}
                    of {judges.length} judges
                  </p>
                  {previewTotalPages > 1 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={previewCurrentPage <= 1}
                        onClick={() =>
                          setPreviewPage((p) => Math.max(1, p - 1))
                        }
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      {Array.from(
                        { length: previewTotalPages },
                        (_, i) => i + 1,
                      )
                        .filter((n) => {
                          if (previewTotalPages <= 5) return true;
                          return (
                            n === 1 ||
                            n === previewTotalPages ||
                            Math.abs(n - previewCurrentPage) <= 1
                          );
                        })
                        .map((n, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev != null && n - prev > 1;
                          return (
                            <span key={n} className="contents">
                              {showEllipsis ? (
                                <span className="px-1 text-muted-foreground">
                                  …
                                </span>
                              ) : null}
                              <Button
                                type="button"
                                size="icon-sm"
                                variant={
                                  n === previewCurrentPage
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => setPreviewPage(n)}
                                aria-current={
                                  n === previewCurrentPage ? "page" : undefined
                                }
                              >
                                {n}
                              </Button>
                            </span>
                          );
                        })}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={previewCurrentPage >= previewTotalPages}
                        onClick={() =>
                          setPreviewPage((p) =>
                            Math.min(previewTotalPages, p + 1),
                          )
                        }
                        aria-label="Next page"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <ul className="space-y-1.5 px-3 py-2">
                  {previewJudges.map((j) => (
                    <li
                      key={j.username}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3"
                    >
                      <span className="min-w-0 break-words font-medium">
                        {j.first_name} {j.last_name}
                        <span className="ml-2 font-normal text-muted-foreground">
                          @{j.username}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {j.group_name || "—"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {j.active ? "active" : "inactive"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {failed.length > 0 ? (
            <div className="flex max-h-[min(40vh,320px)] flex-col overflow-hidden rounded-md border border-rose-200 bg-rose-50 text-sm text-rose-900">
              <p className="shrink-0 border-b border-rose-200/80 px-3 py-2 font-semibold">
                Save errors ({failed.length})
              </p>
              <ul className="list-disc space-y-1.5 overflow-y-auto px-3 py-2 pl-7">
                {failed.map((f) => (
                  <li
                    key={`${f.username}-${f.message}`}
                    className="break-words"
                  >
                    {f.username}: {f.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Close
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={pending || judges.length === 0}
            onClick={runImport}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            Import {judges.length > 0 ? `${judges.length} judges` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
