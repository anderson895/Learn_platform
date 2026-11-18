import { Suspense } from "react";
import type { Metadata } from "next";
import GradingQueue from "@/components/assessments/GradingQueue";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { AssessmentService } from "@/services/AssessmentService";

export const metadata: Metadata = { title: "Submissions" };

/** Pag-grade ng coding exercises (View Activity Feedback, Fig. 5). */
export default function SubmissionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SubmissionsContent />
    </Suspense>
  );
}

async function SubmissionsContent() {
  await requireUser(["admin"]);
  const rows = await new AssessmentService().gradingQueue();
  return <GradingQueue rows={rows} />;
}
