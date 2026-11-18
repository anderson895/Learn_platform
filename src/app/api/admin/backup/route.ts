import { getSessionUser } from "@/lib/auth/session";
import { MaintenanceService } from "@/services/MaintenanceService";

/** Backup Database (Fig. 5): JSON download ng lahat ng data. Admin lang. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Not allowed." }, { status: 403 });

  const data = await new MaintenanceService().backup();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cp1-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
