"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ClipboardList, Eye, Pencil } from "lucide-react";

import type { AssignedProject } from "@/lib/judge/context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  AssignedProject["status"],
  { label: string; dotClass: string; textClass: string }
> = {
  not_started: {
    label: "Not Evaluated",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
  in_progress: {
    label: "Draft Saved",
    dotClass: "bg-group-yellow",
    textClass: "text-group-yellow",
  },
  submitted: {
    label: "Submitted",
    dotClass: "bg-emerald-600",
    textClass: "text-emerald-700",
  },
};

type ProjectCardProps = {
  project: AssignedProject;
  previewJudgeId?: string | null;
};

export function ProjectCard({ project, previewJudgeId }: ProjectCardProps) {
  const meta = STATUS_META[project.status];
  const href = previewJudgeId
    ? `/judge/evaluate/${project.team.id}?previewJudgeId=${previewJudgeId}`
    : `/judge/evaluate/${project.team.id}`;

  const action =
    project.status === "submitted"
      ? {
          label: "View Evaluation",
          icon: Eye,
          variant: "outline" as const,
        }
      : project.status === "in_progress"
        ? {
            label: "Continue Evaluation",
            icon: Pencil,
            variant: "default" as const,
          }
        : {
            label: "Evaluate Project",
            icon: ClipboardList,
            variant: "default" as const,
          };

  const ActionIcon = action.icon;
  const booth = project.team.booth_location?.trim() || project.team.team_number;

  return (
    <motion.article
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="dash-metric flex h-full flex-col p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="dash-section-label">
          Team {project.team.team_number}
        </p>
        <span className="rounded-md bg-muted/80 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {booth.startsWith("Table") || booth.startsWith("Booth")
            ? booth.replace(/^Booth\s*/i, "Table ")
            : `Table ${booth}`}
        </span>
      </div>

      <h3 className="mb-3 text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
        {project.team.project_title}
      </h3>

      <div
        className={cn(
          "mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-semibold sm:text-sm",
          meta.textClass,
        )}
      >
        <span className={cn("size-2 rounded-full", meta.dotClass)} aria-hidden />
        {meta.label}
      </div>

      <div className="mt-auto">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            asChild
            variant={action.variant}
            size="lg"
            className={cn(
              "w-full gap-2 text-xs font-bold tracking-wide uppercase",
              action.variant === "outline" &&
                "border-primary text-primary hover:bg-primary/5",
            )}
          >
            <Link href={href}>
              <ActionIcon className="size-4" aria-hidden />
              {action.label}
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.article>
  );
}
