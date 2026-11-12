"use client";

import { Columns3, LayoutList } from "lucide-react";

import {
  FILTER_SELECT_CLASS,
  FilterToolbar,
  FilterViewToggle,
} from "@/components/shared/filter-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import type { JudgesViewMode } from "@/lib/machines/judges-manager";
import { cn } from "@/lib/utils";

export type { JudgesViewMode };

type JudgesFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  domain: string;
  onDomainChange: (value: string) => void;
  domains: string[];
  company: string;
  onCompanyChange: (value: string) => void;
  companies: string[];
  status: "all" | "active" | "inactive";
  onStatusChange: (value: "all" | "active" | "inactive") => void;
  view: JudgesViewMode;
  onViewChange: (view: JudgesViewMode) => void;
};

/**
 * Judges Management toolbar — same SearchInput + rounded-md filters as Teams/Assignments.
 */
export function JudgesFilterBar({
  query,
  onQueryChange,
  domain,
  onDomainChange,
  domains,
  company,
  onCompanyChange,
  companies,
  status,
  onStatusChange,
  view,
  onViewChange,
}: JudgesFilterBarProps) {
  return (
    <FilterToolbar className="dash-table-shell border border-border p-4">
      <div className="min-w-0 flex-1">
        <SearchInput
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search judges by name, login, or company…"
          aria-label="Search judges"
        />
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        <Select
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          className={cn(FILTER_SELECT_CLASS, "sm:max-w-[16rem] sm:min-w-[11rem]")}
          aria-label="Filter by domain"
        >
          <option value="all">All Domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>

        <Select
          value={company}
          onChange={(e) => onCompanyChange(e.target.value)}
          className={FILTER_SELECT_CLASS}
          aria-label="Filter by company"
        >
          <option value="all">All Companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as "all" | "active" | "inactive")
          }
          className={cn(FILTER_SELECT_CLASS, "sm:min-w-[8.5rem]")}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      <FilterViewToggle
        aria-label="Judges view"
        value={view}
        onChange={(id) => onViewChange(id as JudgesViewMode)}
        options={[
          {
            id: "kanban",
            label: "Kanban Board",
            icon: <Columns3 className="size-3.5 shrink-0" aria-hidden />,
          },
          {
            id: "matrix",
            label: "Matrix Table",
            icon: <LayoutList className="size-3.5 shrink-0" aria-hidden />,
          },
        ]}
      />
    </FilterToolbar>
  );
}
