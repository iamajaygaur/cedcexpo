import { handleAdminCsvExport } from "@/lib/admin/export-csv";

type RouteContext = {
  // unused — Next route
};

export async function GET(request: Request, _ctx: RouteContext) {
  void _ctx;
  const { searchParams } = new URL(request.url);
  return handleAdminCsvExport("master", searchParams);
}
