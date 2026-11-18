import AdminShell from "@/components/layout/AdminShell";
import { getViewer, requireUser } from "@/lib/auth/session";
import { SubmissionRepository } from "@/repositories/ProgressRepositories";

// Binabasa ang session sa bawat request, kaya pinapayagan itong mag-block (Cache Components).
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["admin"]);
  const [viewer, coding] = await Promise.all([getViewer(user), new SubmissionRepository().findWhere("refType", "codingExercise")]);
  const pendingSubmissions = coding.filter((submission) => submission.completionStatus === "submitted").length;
  return (
    <AdminShell viewer={viewer} pendingSubmissions={pendingSubmissions}>
      {children}
    </AdminShell>
  );
}
