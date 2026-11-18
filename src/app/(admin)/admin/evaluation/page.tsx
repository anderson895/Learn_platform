import { Suspense } from "react";
import type { Metadata } from "next";
import EvaluationAdmin from "@/components/evaluation/EvaluationAdmin";
import { EVALUATION_TABS, type EvaluationTab } from "@/components/evaluation/tabs";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { EvaluationService } from "@/services/EvaluationService";

export const metadata: Metadata = { title: "PIECES Evaluation" };

type Props = { searchParams: Promise<{ tab?: string }> };

/** PIECES Evaluation (Objective 3): resulta, questionnaire at mga sumagot. */
export default function EvaluationAdminPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageLoading rows={5} />}>
      <EvaluationAdminContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EvaluationAdminContent({ searchParams }: Props) {
  await requireUser(["admin"]);
  const service = new EvaluationService();
  const [{ tab }, questionnaire, results] = await Promise.all([searchParams, service.getQuestionnaire(), service.results()]);
  const initialTab = EVALUATION_TABS.includes(tab as EvaluationTab) ? (tab as EvaluationTab) : "results";
  return <EvaluationAdmin questionnaire={questionnaire} results={results} initialTab={initialTab} />;
}
