import { Badge } from "@/components/ui/badge";

type PlaceholderPageProps = {
  title: string;
  description: string;
  phaseHint?: string;
};

export function PlaceholderPage({
  title,
  description,
  phaseHint = "Full UI arrives in a later phase",
}: PlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
          {title}
        </h1>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
        {description}
      </p>
      <p className="text-xs font-medium uppercase tracking-wider text-primary">
        {phaseHint}
      </p>
    </div>
  );
}
