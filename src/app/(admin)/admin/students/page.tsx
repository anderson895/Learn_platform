import { Suspense } from "react";
import type { Metadata } from "next";
import StudentAccountsManager from "@/components/students/StudentAccountsManager";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { StudentAccountService } from "@/services/StudentAccountService";

export const metadata: Metadata = { title: "Student Accounts" };

/** Manage Student Accounts at Account Status Management. */
export default function StudentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentsContent />
    </Suspense>
  );
}

async function StudentsContent() {
  await requireUser(["admin"]);
  const rows = await new StudentAccountService().list();
  return <StudentAccountsManager rows={rows} />;
}
