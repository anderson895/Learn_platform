import { Suspense } from "react";
import type { Metadata } from "next";
import ReportsView from "@/components/reports/ReportsView";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ReportService } from "@/services/ReportService";

export const metadata: Metadata = { title: "Reports" };

/** Report Management (Fig. 5). */
export default function ReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  await requireUser(["admin"]);
  const reports = new ReportService();
  const [progress, assessments, performance] = await Promise.all([reports.studentProgress(), reports.assessments(), reports.performance()]);
  return (
    <ReportsView
      progress={progress}
      assessments={assessments}
      performance={performance}
      generatedAt={new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" })}
    />
  );
}
