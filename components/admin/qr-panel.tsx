"use client";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { regenerateTeamQrAction } from "@/lib/admin/actions/teams";

type QrPanelProps = {
  teamId: string;
  teamNumber: string;
  projectTitle: string;
  boothLocation: string;
  qrUrl: string;
  qrDataUrl: string;
};

export function QrPanel({
  teamId,
  teamNumber,
  projectTitle,
  boothLocation,
  qrUrl,
  qrDataUrl,
}: QrPanelProps) {
  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `team-${teamNumber}-qr.png`;
    link.click();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(qrUrl);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6 rounded-md border border-border bg-card p-6 print:border-0 print:shadow-none">
      <div className="text-center print:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          CEDC Expo
        </p>
        <h2 className="mt-1 text-2xl font-bold">Team {teamNumber}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{projectTitle}</p>
        {boothLocation ? (
          <p className="mt-1 text-sm font-medium">
            {boothLocation.startsWith("Table") || boothLocation.startsWith("Booth")
              ? boothLocation.replace(/^Booth\s*/i, "Table ")
              : `Table ${boothLocation}`}
          </p>
        ) : null}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt={`QR code for Team ${teamNumber}`}
        className="mx-auto size-64 rounded-md border border-border bg-white p-2"
      />

      <p className="break-all text-center text-xs text-muted-foreground print:hidden">
        {qrUrl}
      </p>

      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <Button type="button" size="lg" onClick={handlePrint}>
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleDownload}
        >
          Download PNG
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void handleCopy()}
        >
          Copy link
        </Button>
      </div>

      <div className="border-t border-border pt-4 print:hidden">
        <AdminActionForm action={regenerateTeamQrAction}>
          <input type="hidden" name="id" value={teamId} />
          <Button type="submit" variant="destructive" size="sm">
            Regenerate QR id
          </Button>
        </AdminActionForm>
        <p className="mt-2 text-xs text-muted-foreground">
          Regenerating invalidates previously printed codes. Knowing the QR URL
          never bypasses judge group authorization.
        </p>
      </div>
    </div>
  );
}
