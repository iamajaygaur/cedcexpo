"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  Lightbulb,
  Presentation,
  Send,
  Sparkles,
  Users,
  Globe2,
  type LucideIcon,
} from "lucide-react";

import {
  SaveStatusIndicator,
  type SaveStatus,
} from "@/components/judge/save-status-indicator";
import {
  showAppFeedbackFromResult,
} from "@/components/shared/app-feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssignedProject } from "@/lib/judge/context";
import {
  saveEvaluationDraftAction,
  submitEvaluationAction,
} from "@/lib/judge/actions/evaluations";
import type { CriterionWithAbet } from "@/lib/judge/evaluation-data";
import type { EvaluationScore, Event, Team } from "@/types/database";
import { cn } from "@/lib/utils";

type ScoreState = Record<string, { score: number | null; comment: string }>;

type EvaluationFormProps = {
  team: Team;
  event: Event;
  project: AssignedProject;
  criteria: CriterionWithAbet[];
  initialScores: EvaluationScore[];
  /** Admin viewing form without a judge assignment — UI only. */
  adminPreview?: boolean;
};

/** Standard ABET EAC 1–7 wording for the reference note. */
const ABET_REFERENCE: { code: string; label: string }[] = [
  {
    code: "1",
    label:
      "an ability to identify, formulate, and solve complex engineering problems by applying principles of engineering, science, and mathematics",
  },
  {
    code: "2",
    label:
      "an ability to apply engineering design to produce solutions that meet specified needs with consideration of public health, safety, and welfare, as well as global, cultural, social, environmental, and economic factors",
  },
  {
    code: "3",
    label:
      "an ability to communicate effectively with a range of audiences",
  },
  {
    code: "4",
    label:
      "an ability to recognize ethical and professional responsibilities in engineering situations and make informed judgments, which must consider the impact of engineering solutions in global, economic, environmental, and societal contexts",
  },
  {
    code: "5",
    label:
      "an ability to function effectively on a team whose members together provide leadership, create a collaborative and inclusive environment, establish goals, plan tasks, and meet objectives",
  },
  {
    code: "6",
    label:
      "an ability to develop and conduct appropriate experimentation, analyze and interpret data, and use engineering judgment to draw conclusions",
  },
  {
    code: "7",
    label:
      "an ability to acquire and apply new knowledge as needed, using appropriate learning strategies",
  },
];

const CRITERION_ICONS: LucideIcon[] = [
  Lightbulb,
  Users,
  Presentation,
  Sparkles,
  Globe2,
];

function criterionIcon(name: string, index: number): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("design") || n.includes("execution")) return Lightbulb;
  if (n.includes("professional")) return Users;
  if (n.includes("present")) return Presentation;
  if (n.includes("team")) return Sparkles;
  if (n.includes("impact") || n.includes("global")) return Globe2;
  return CRITERION_ICONS[index % CRITERION_ICONS.length]!;
}

function buildScoreState(
  criteria: CriterionWithAbet[],
  initialScores: EvaluationScore[],
): ScoreState {
  const map: ScoreState = {};
  for (const c of criteria) {
    const existing = initialScores.find((s) => s.criterion_id === c.id);
    map[c.id] = {
      // Only treat as entered when a score row already exists on the server.
      score: existing ? Number(existing.score) : null,
      comment: existing?.comment ?? "",
    };
  }
  return map;
}

function pickScoresForCriteria(
  criteria: CriterionWithAbet[],
  incoming: ScoreState,
): ScoreState {
  const next: ScoreState = {};
  for (const c of criteria) {
    const row = incoming[c.id];
    next[c.id] = {
      score:
        row && row.score !== null && Number.isFinite(Number(row.score))
          ? Number(row.score)
          : null,
      comment: row?.comment ?? "",
    };
  }
  return next;
}

function localStorageKey(teamId: string) {
  return `cedc-eval-draft-${teamId}`;
}

export function EvaluationForm({
  team,
  event,
  project,
  criteria,
  initialScores,
  adminPreview = false,
}: EvaluationFormProps) {
  const router = useRouter();
  const isSubmitted = project.evaluation?.status === "submitted";
  const readOnly = isSubmitted || adminPreview;

  const [comments, setComments] = useState(project.evaluation?.comments ?? "");
  const [scores, setScores] = useState<ScoreState>(() =>
    buildScoreState(criteria, initialScores),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const successRedirectRef = useRef(false);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const restoredLocalRef = useRef(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const criteriaIds = useMemo(
    () => criteria.map((c) => c.id).join("|"),
    [criteria],
  );

  // Hide sticky chrome when the mobile virtual keyboard covers the viewport.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = window.innerHeight - vv.height;
      setKeyboardOpen(covered > 120);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const scrollFieldIntoView = useCallback((el: HTMLElement) => {
    window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 280);
  }, []);

  // Only sum scores for the current rubric criteria (ignore stale local drafts).
  const totalScore = useMemo(
    () =>
      criteria.reduce((sum, c) => {
        const value = scores[c.id]?.score;
        return sum + (value !== null && Number.isFinite(value) ? value : 0);
      }, 0),
    [criteria, scores],
  );

  const enteredCount = useMemo(
    () =>
      criteria.filter((c) => {
        const value = scores[c.id]?.score;
        return value !== null && Number.isFinite(value);
      }).length,
    [criteria, scores],
  );

  const maxTotal = useMemo(
    () => criteria.reduce((sum, c) => sum + Number(c.max_score), 0),
    [criteria],
  );

  const maxPerCriterion = useMemo(() => {
    if (criteria.length === 0) return 10;
    const values = criteria.map((c) => Number(c.max_score));
    const first = values[0]!;
    return values.every((v) => v === first) ? first : Math.max(...values);
  }, [criteria]);

  const abetNoteItems = useMemo(() => {
    const used = new Set<string>();
    for (const c of criteria) {
      for (const o of c.criterion_abet_outcomes) {
        used.add(String(o.outcome_code).replace(/^ABET\s*/i, "").trim());
      }
    }
    const filtered = ABET_REFERENCE.filter((item) => used.has(item.code));
    return filtered.length > 0 ? filtered : ABET_REFERENCE;
  }, [criteria]);

  useEffect(() => {
    if (isSubmitted || adminPreview || restoredLocalRef.current) return;
    try {
      const raw = localStorage.getItem(localStorageKey(team.id));
      if (!raw) {
        restoredLocalRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as {
        comments?: string;
        scores?: ScoreState;
      };
      if (initialScores.length === 0 && parsed.scores) {
        const cleaned = pickScoresForCriteria(criteria, parsed.scores);
        const hasAny = Object.values(cleaned).some(
          (row) => row.score !== null || row.comment.trim().length > 0,
        );
        if (!hasAny) {
          localStorage.removeItem(localStorageKey(team.id));
        } else {
          setScores(cleaned);
          if (parsed.comments) setComments(parsed.comments);
          setSaveStatus("unsaved");
          dirtyRef.current = true;
        }
      }
    } catch {
      localStorage.removeItem(localStorageKey(team.id));
    } finally {
      restoredLocalRef.current = true;
    }
    // criteriaIds keeps restore stable when the criteria array identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once per team/criteria set
  }, [team.id, isSubmitted, adminPreview, initialScores.length, criteriaIds]);

  const payload = useCallback(
    () => ({
      team_id: team.id,
      event_id: event.id,
      assignment_id: project.assignmentId,
      comments,
      scores: criteria.map((c) => ({
        criterion_id: c.id,
        // Drafts may store 0 for blank fields; submit validates separately.
        score: scores[c.id]?.score ?? 0,
        comment: scores[c.id]?.comment ?? "",
      })),
    }),
    [team.id, event.id, project.assignmentId, comments, criteria, scores],
  );

  const persistLocal = useCallback(() => {
    if (isSubmitted) return;
    try {
      localStorage.setItem(
        localStorageKey(team.id),
        JSON.stringify({ comments, scores }),
      );
    } catch {
      // storage full / private mode
    }
  }, [team.id, comments, scores, isSubmitted]);

  const saveDraft = useCallback(async () => {
    if (readOnly || savingRef.current) return;
    if (
      !project.assignmentId ||
      project.assignmentId === "00000000-0000-0000-0000-000000000000"
    ) {
      setSaveStatus("error");
      setSaveError(
        "This team is not assigned to your judge group, so scores cannot be saved.",
      );
      return;
    }

    savingRef.current = true;
    setSaveStatus("saving");
    setSaveError(null);
    persistLocal();

    if (offline) {
      setSaveStatus("error");
      setSaveError(
        "You're offline. Scores are kept on this device and will sync when you reconnect.",
      );
      savingRef.current = false;
      dirtyRef.current = true;
      return;
    }

    const result = await saveEvaluationDraftAction(payload());
    savingRef.current = false;

    if (result.ok) {
      dirtyRef.current = false;
      setSaveStatus("saved");
      setSaveError(null);
      router.refresh();
    } else {
      setSaveStatus("error");
      setSaveError(result.message ?? "Could not save draft.");
    }
  }, [
    readOnly,
    offline,
    payload,
    persistLocal,
    router,
    project.assignmentId,
  ]);

  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      if (dirtyRef.current && !readOnly) {
        void saveDraft();
      }
    };
    const onOffline = () => setOffline(true);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [readOnly, saveDraft]);

  useEffect(() => {
    if (readOnly || !dirtyRef.current) return;
    setSaveStatus("unsaved");
    const timer = setTimeout(() => {
      void saveDraft();
    }, 2000);
    return () => clearTimeout(timer);
  }, [comments, scores, readOnly, saveDraft]);

  const setScoreValue = (criterionId: string, score: number | null) => {
    if (readOnly) return;
    dirtyRef.current = true;
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        score,
        comment: prev[criterionId]?.comment ?? "",
      },
    }));
  };

  const setCriterionComment = (criterionId: string, comment: string) => {
    if (readOnly) return;
    dirtyRef.current = true;
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        score: prev[criterionId]?.score ?? null,
        comment,
      },
    }));
  };

  async function handleSubmit() {
    successRedirectRef.current = false;
    if (offline) {
      showAppFeedbackFromResult(
        false,
        "You're offline. Your evaluation is saved on this device and will sync when the connection returns.",
      );
      persistLocal();
      return;
    }

    const missing = criteria.filter((c) => scores[c.id]?.score === null);
    if (missing.length > 0) {
      setConfirmOpen(false);
      showAppFeedbackFromResult(
        false,
        `Enter a score for every criterion (${missing.length} remaining).`,
      );
      return;
    }

    for (const c of criteria) {
      const value = scores[c.id]?.score;
      const max = Number(c.max_score);
      if (value === null || value < 0 || value > max) {
        setConfirmOpen(false);
        showAppFeedbackFromResult(
          false,
          `Score for "${c.name}" must be between 0 and ${max}.`,
        );
        return;
      }
    }

    const result = await submitEvaluationAction(payload());
    if (result.ok) {
      localStorage.removeItem(localStorageKey(team.id));
      setConfirmOpen(false);
      successRedirectRef.current = true;
      window.setTimeout(() => {
        showAppFeedbackFromResult(
          true,
          result.message ?? "Evaluation submitted successfully.",
          {
            onDismiss: () => {
              if (successRedirectRef.current) {
                successRedirectRef.current = false;
                router.push("/judge/dashboard");
                router.refresh();
              }
            },
          },
        );
      }, 0);
      return;
    }
    setConfirmOpen(false);
    showAppFeedbackFromResult(false, result.message ?? "Submission failed.");
  }

  const deptLabel = team.category?.trim() || null;
  const members = project.members ?? [];

  return (
    <div
      className={cn(
        "space-y-4 md:space-y-5",
        keyboardOpen
          ? "pb-4"
          : "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-28",
      )}
    >
      {offline ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:px-4 sm:py-3"
        >
          You&apos;re offline. Scores are kept on this device and will sync when
          you reconnect.
        </div>
      ) : null}

      {/* Project header */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <span className="rounded-md bg-primary-container/40 px-2 py-0.5 text-[11px] font-semibold text-on-primary-container sm:px-2.5 sm:py-1 sm:text-xs">
              Team #{team.team_number}
            </span>
            <span className="rounded-md bg-primary-container/40 px-2 py-0.5 text-[11px] font-semibold text-on-primary-container sm:px-2.5 sm:py-1 sm:text-xs">
              {team.booth_location?.trim()
                ? team.booth_location.startsWith("Table") ||
                  team.booth_location.startsWith("Booth")
                  ? team.booth_location.replace(/^Booth\s*/i, "Table ")
                  : `Table ${team.booth_location}`
                : "Table TBD"}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {team.project_title}
          </h1>
          {deptLabel ? (
            <p className="text-sm text-muted-foreground">Dept: {deptLabel}</p>
          ) : null}
          {(event.semester || event.name) && (
            <p className="text-xs text-muted-foreground">
              {[event.semester, event.name].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Collapsed on mobile so scoring stays above the fold */}
        <details className="w-full shrink-0 rounded-md border border-border bg-card lg:hidden">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Team Members
              <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/80">
                {members.length > 0
                  ? `${members.length} · tap to view`
                  : "None listed"}
              </span>
            </span>
          </summary>
          <div className="border-t border-border px-3 pb-3 pt-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members listed</p>
            ) : (
              <ul className="space-y-1.5">
                {members.map((m) => (
                  <li key={m.id} className="text-sm font-medium text-foreground">
                    {m.student_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

        <aside className="hidden w-64 shrink-0 rounded-md border border-border bg-card p-4 lg:block">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Team Members
          </p>
          {members.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No members listed</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {members.map((m) => (
                <li key={m.id} className="text-sm font-medium text-foreground">
                  {m.student_name}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </header>

      {/* Instructions — compact on phone */}
      <div className="flex gap-2.5 rounded-md border border-border bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
        <Info
          className="mt-0.5 size-3.5 shrink-0 text-primary sm:size-4"
          aria-hidden
        />
        <p>
          <span className="font-semibold text-foreground">Instructions: </span>
          Score 1–{maxPerCriterion} per criterion (max {maxTotal} total).
          Comments are optional.
        </p>
      </div>

      {criteria.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No evaluation criteria configured for this event yet.
        </p>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {criteria.map((criterion, index) => {
            const row = scores[criterion.id] ?? { score: null, comment: "" };
            const max = Number(criterion.max_score);
            const Icon = criterionIcon(criterion.name, index);
            const hasScore = row.score !== null;
            const descExpanded = Boolean(expandedDescriptions[criterion.id]);
            const description = criterion.description?.trim() ?? "";
            const longDescription = description.length > 110;

            return (
              <section
                key={criterion.id}
                className="rounded-md border border-border bg-card p-3 shadow-sm sm:p-5"
              >
                {/* Title row + inline score on mobile */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:mt-0 sm:size-10">
                    <Icon className="size-4 sm:size-5" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground sm:text-lg">
                        {index + 1}. {criterion.name}
                      </h2>

                      {/* Compact score control — phone only */}
                      <div className="flex shrink-0 flex-col items-end sm:hidden">
                        <label
                          className="sr-only"
                          htmlFor={`score-mobile-${criterion.id}`}
                        >
                          Score for {criterion.name}
                        </label>
                        <input
                          id={`score-mobile-${criterion.id}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="done"
                          disabled={readOnly}
                          value={hasScore ? String(row.score) : ""}
                          placeholder="--"
                          aria-describedby={`score-max-mobile-${criterion.id}`}
                          suppressHydrationWarning
                          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d]/g, "");
                            if (raw === "") {
                              setScoreValue(criterion.id, null);
                              return;
                            }
                            const n = Number(raw);
                            if (!Number.isFinite(n)) return;
                            setScoreValue(
                              criterion.id,
                              Math.min(max, Math.max(0, Math.round(n))),
                            );
                          }}
                          className="h-11 w-14 rounded-md border border-dashed border-primary/35 bg-sky-50/80 text-center text-lg font-bold tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
                        />
                        <span
                          id={`score-max-mobile-${criterion.id}`}
                          className="mt-0.5 text-[10px] tabular-nums text-muted-foreground"
                        >
                          / {max}
                        </span>
                      </div>
                    </div>

                    {description ? (
                      <div className="mt-1">
                        <p
                          className={cn(
                            "text-xs leading-relaxed text-muted-foreground sm:text-sm",
                            !descExpanded &&
                              longDescription &&
                              "line-clamp-2 sm:line-clamp-none",
                          )}
                        >
                          {description}
                        </p>
                        {longDescription ? (
                          <button
                            type="button"
                            className="mt-0.5 text-[11px] font-medium text-primary sm:hidden"
                            onClick={() =>
                              setExpandedDescriptions((prev) => ({
                                ...prev,
                                [criterion.id]: !prev[criterion.id],
                              }))
                            }
                          >
                            {descExpanded ? "Show less" : "Show more"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {criterion.criterion_abet_outcomes.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
                        {criterion.criterion_abet_outcomes.map((o) => (
                          <span
                            key={o.id}
                            className="rounded bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:rounded-md sm:px-2 sm:py-0.5 sm:text-[10px]"
                          >
                            ABET {o.outcome_code}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Desktop / tablet score panel */}
                  <div className="hidden w-36 shrink-0 flex-col items-center rounded-md bg-muted/50 px-4 py-3 sm:flex">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Judge&apos;s Score
                    </p>
                    <label
                      className="sr-only"
                      htmlFor={`score-${criterion.id}`}
                    >
                      Score for {criterion.name}
                    </label>
                    <input
                      id={`score-${criterion.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={max}
                      step={1}
                      autoComplete="off"
                      disabled={readOnly}
                      value={hasScore ? String(row.score) : ""}
                      placeholder="--"
                      suppressHydrationWarning
                      onWheel={(e) => {
                        e.currentTarget.blur();
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          setScoreValue(criterion.id, null);
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n)) return;
                        setScoreValue(
                          criterion.id,
                          Math.min(max, Math.max(0, Math.round(n))),
                        );
                      }}
                      className="mt-2 h-14 w-full rounded-md border border-dashed border-primary/30 bg-sky-50/80 text-center text-2xl font-bold tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Maximum: {max}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 sm:mt-4">
                  <Textarea
                    value={row.comment}
                    disabled={readOnly}
                    rows={2}
                    autoComplete="off"
                    autoCorrect="on"
                    enterKeyHint="done"
                    placeholder={`Optional comments on ${criterion.name}...`}
                    onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                    onChange={(e) =>
                      setCriterionComment(criterion.id, e.target.value)
                    }
                    className="min-h-12 resize-y bg-background text-base sm:min-h-16 sm:text-sm"
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ABET reference — collapsed by default on phones */}
      <details className="rounded-md border border-border bg-muted/50 sm:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            ABET Outcomes Reference
            <span className="text-[11px] font-medium text-muted-foreground">
              Tap to expand
            </span>
          </span>
        </summary>
        <div className="border-t border-border px-4 pb-4 pt-3">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {abetNoteItems.map((item) => (
              <li key={item.code} className="flex gap-2">
                <span className="font-semibold text-foreground">
                  {item.code}.
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </details>

      <section className="hidden rounded-md border border-border bg-muted/50 px-5 py-4 sm:block">
        <h2 className="text-sm font-bold text-foreground">
          Note — ABET Engineering Criteria Program Educational Outcomes
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          {abetNoteItems.map((item) => (
            <li key={item.code} className="flex gap-2">
              <span className="font-semibold text-foreground">{item.code}.</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Sticky score + submit — hide while the virtual keyboard is open */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur transition-transform duration-200 md:left-[min(260px,30vw)] md:z-40 md:translate-y-0 md:pointer-events-auto",
          keyboardOpen
            ? "pointer-events-none translate-y-full md:translate-y-0"
            : "translate-y-0",
        )}
        aria-hidden={keyboardOpen || undefined}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Score
            </span>
            <span className="inline-flex min-w-[5.5rem] items-center justify-center rounded-md bg-muted px-4 py-2 text-xl font-bold tabular-nums text-foreground">
              {totalScore} / {maxTotal}
            </span>
            <SaveStatusIndicator
              status={saveStatus}
              message={
                saveStatus === "error" ? (saveError ?? undefined) : undefined
              }
            />
            {enteredCount > 0 && enteredCount < criteria.length ? (
              <span className="text-xs text-muted-foreground">
                {enteredCount}/{criteria.length} scored
              </span>
            ) : null}
          </div>

          {!readOnly ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11 flex-1 touch-manipulation sm:flex-none"
                onClick={() => void saveDraft()}
              >
                Save draft
              </Button>
              <Button
                type="button"
                size="lg"
                className="min-h-11 flex-1 gap-2 touch-manipulation sm:flex-none"
                onClick={() => setConfirmOpen(true)}
                disabled={criteria.length === 0}
              >
                <Send className="size-4" aria-hidden />
                Submit Evaluation
              </Button>
            </div>
          ) : adminPreview ? (
            <p className="text-sm font-medium text-muted-foreground">
              Preview only — submit disabled
            </p>
          ) : (
            <p className="text-sm font-medium text-emerald-700">
              Submitted
              {project.evaluation?.submitted_at
                ? ` · ${new Date(project.evaluation.submitted_at).toLocaleString()}`
                : ""}
            </p>
          )}
        </div>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-eval-title"
        >
          <div className="w-full max-w-md rounded-md bg-card p-6 shadow-xl">
            <h2 id="submit-eval-title" className="text-lg font-semibold">
              Submit evaluation?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You won&apos;t be able to edit scores after submission. Total
              score: {totalScore} / {maxTotal}.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSubmit()}>
                Confirm submit
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
