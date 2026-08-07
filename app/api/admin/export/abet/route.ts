import { handleAdminCsvExport } from "@/lib/admin/export-csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleAdminCsvExport("abet", searchParams);
}
