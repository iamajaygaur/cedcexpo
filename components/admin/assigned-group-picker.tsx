"use client";

import { useState } from "react";

import { getGroupColorToken } from "@/lib/groups/color-tokens";
import { cn } from "@/lib/utils";
import type { JudgeGroup } from "@/types/database";

type AssignedGroupPickerProps = {
  name?: string;
  groups: JudgeGroup[];
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
};

export function AssignedGroupPicker({
  name = "group_id",
  groups,
  defaultValue = "",
  disabled = false,
  id,
}: AssignedGroupPickerProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div id={id} className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Assigned group">
        <button
          type="button"
          role="radio"
          aria-checked={value === ""}
          disabled={disabled}
          onClick={() => setValue("")}
          className={cn(
            "ui-interactive-quiet inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold",
            value === ""
              ? "border-foreground bg-muted text-foreground"
              : "border-border bg-background text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          Unassigned
        </button>
        {groups.map((group) => {
          const token = getGroupColorToken(group.color_key);
          const selected = value === group.id;
          return (
            <button
              key={group.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => setValue(group.id)}
              className={cn(
                "ui-interactive-quiet inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold",
                token.bgClass,
                token.textClass,
                token.ringClass,
                selected && "ring-2 ring-primary/25",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn("size-2 rounded-full", token.dotClass)}
                aria-hidden
              />
              {group.name}
            </button>
          );
        })}
      </div>
      {groups.length === 0 && !disabled ? (
        <p className="text-xs text-muted-foreground">
          No color groups for this event yet. Create them under Groups.
        </p>
      ) : null}
    </div>
  );
}
