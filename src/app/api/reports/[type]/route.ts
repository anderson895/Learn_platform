import { getSessionUser } from "@/lib/auth/session";
import { ReportService, type ReportType } from "@/services/ReportService";

const TYPES: ReportType[] = ["progress", "assessments", "performance"];

/** CSV export ng reports (admin at chairman lang). */
export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "admin" && user.role !== "chairman") return Response.json({ error: "Not allowed." }, { status: 403 });

  const { type } = await params;
  if (!TYPES.includes(type as ReportType)) return Response.json({ error: "Unknown report." }, { status: 404 });

  const csv = await new ReportService().csv(type as ReportType);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cp1-${type}-report-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
