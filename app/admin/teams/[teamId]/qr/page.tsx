import Link from "next/link";
import { notFound } from "next/navigation";

import { QrPanel } from "@/components/admin/qr-panel";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { generateTeamQrDataUrl } from "@/lib/admin/qr";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import { teamQrUrl } from "@/lib/utils/app-url";
import type { Team } from "@/types/database";

type PageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamQrPage({ params }: PageProps) {
  const { teamId } = await params;
  const { supabase } = await requireAdminClient();

  const { data: team, error } = await supabase
    .from(TABLES.teams)
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!team) notFound();

  const typed = team as Team;
  const url = teamQrUrl(typed.qr_identifier);
  const dataUrl = await generateTeamQrDataUrl(typed.qr_identifier);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/teams?eventId=${typed.event_id}`}>
            ← Back to teams
          </Link>
        </Button>
      </div>
      <PageHeader
        breadcrumbs={[
          { label: "Teams", href: "/admin/teams" },
          { label: `Team ${typed.team_number}` },
          { label: "QR" },
        ]}
        title={`QR — Team ${typed.team_number}`}
        description={typed.project_title}
      />
      <QrPanel
        teamNumber={typed.team_number}
        projectTitle={typed.project_title}
        boothLocation={typed.booth_location}
        qrUrl={url}
        qrDataUrl={dataUrl}
        teamId={typed.id}
      />
    </div>
  );
}
