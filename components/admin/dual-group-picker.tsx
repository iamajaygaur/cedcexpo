"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Select } from "@/components/ui/select";
import { MAX_ASSIGNED_GROUPS_PER_TEAM } from "@/lib/groups/assignment-limits";
import type { JudgeGroup } from "@/types/database";

type DualGroupPickerProps = {
  groups: JudgeGroup[];
  defaultSelectedIds?: string[];
  disabled?: boolean;
  name?: string;
  id?: string;
  /** Rendered inline after Group 2 (e.g. Save / Clear scores). */
  actions?: ReactNode;
};

const NONE = "";

/**
 * Two dropdowns to assign up to two color groups for dual evaluation.
 */
export function DualGroupPicker({
  groups,
  defaultSelectedIds = [],
  disabled = false,
  name = "group_ids",
  id,
  actions,
}: DualGroupPickerProps) {
  const initial = Array.from(new Set(defaultSelectedIds)).slice(
    0,
    MAX_ASSIGNED_GROUPS_PER_TEAM,
  );

  const [firstId, setFirstId] = useState(initial[0] ?? NONE);
  const [secondId, setSecondId] = useState(initial[1] ?? NONE);

  const selectedIds = useMemo(() => {
    const ids: string[] = [];
    if (firstId) ids.push(firstId);
    if (secondId && secondId !== firstId) ids.push(secondId);
    return ids;
  }, [firstId, secondId]);

  function onFirstChange(value: string) {
    setFirstId(value);
    if (value && value === secondId) {
      setSecondId(NONE);
    }
    if (!value) {
      setSecondId(NONE);
    }
  }

  function onSecondChange(value: string) {
    if (value && value === firstId) return;
    setSecondId(value);
  }

  return (
    <div id={id} className="min-w-[280px] space-y-2">
      {selectedIds.map((gid) => (
        <input key={gid} type="hidden" name={name} value={gid} />
      ))}

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[140px] space-y-1.5">
          <label
            htmlFor={id ? `${id}-first` : undefined}
            className="text-xs font-medium text-muted-foreground"
          >
            Group 1
          </label>
          <Select
            id={id ? `${id}-first` : undefined}
            value={firstId}
            disabled={disabled || groups.length === 0}
            onChange={(e) => onFirstChange(e.target.value)}
            aria-label="First color group"
            className="h-9"
          >
            <option value={NONE}>None</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-[140px] space-y-1.5">
          <label
            htmlFor={id ? `${id}-second` : undefined}
            className="text-xs font-medium text-muted-foreground"
          >
            Group 2
          </label>
          <Select
            id={id ? `${id}-second` : undefined}
            value={secondId}
            disabled={disabled || !firstId || groups.length < 2}
            onChange={(e) => onSecondChange(e.target.value)}
            aria-label="Second color group"
            className="h-9"
          >
            <option value={NONE}>None</option>
            {groups
              .filter((group) => group.id !== firstId)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </Select>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 pb-px">{actions}</div>
        ) : null}
      </div>

      {groups.length === 0 && !disabled ? (
        <p className="text-xs text-muted-foreground">
          No color groups yet. Create them under Groups first.
        </p>
      ) : null}
    </div>
  );
}
