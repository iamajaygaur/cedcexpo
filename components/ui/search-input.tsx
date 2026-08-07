import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * App-wide search field — matches the header top-bar search:
 * muted fill, medium radius, leading search icon.
 */
function SearchInput({
  className,
  type = "search",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type={type}
        data-slot="search-input"
        className={cn(
          "h-10 w-full rounded-md border-0 bg-muted/70 pr-3 pl-10 text-sm text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      />
    </div>
  );
}

export { SearchInput };
