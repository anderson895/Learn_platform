import { getSessionUser } from "@/lib/auth/session";
import { EvaluationService, type EvaluationCsv } from "@/services/EvaluationService";

const KINDS: EvaluationCsv[] = ["summary", "responses"];

/** CSV ng PIECES Evaluation (admin lang). */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Not allowed." }, { status: 403 });

  const { kind } = await params;
  if (!KINDS.includes(kind as EvaluationCsv)) return Response.json({ error: "Unknown export." }, { status: 404 });

  const csv = await new EvaluationService().csv(kind as EvaluationCsv);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pieces-${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
