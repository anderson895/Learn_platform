import { Suspense } from "react";
import type { Metadata } from "next";
import AssessmentBuilder from "@/components/assessments/AssessmentBuilder";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { AssessmentService } from "@/services/AssessmentService";
import { ContentService } from "@/services/ContentService";

export const metadata: Metadata = { title: "Assessments" };

/** Assessment Builder (Create Activities, Create Assignments, Create Quizzes). */
export default function AssessmentsPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  return (
    <Suspense fallback={<PageLoading rows={4} />}>
      <AssessmentsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AssessmentsContent({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  await requireUser(["admin"]);
  const [{ lesson: requested }, lessons] = await Promise.all([searchParams, new ContentService().listLessons()]);
  const selected = lessons.find((lesson) => lesson.id === requested) ?? lessons[0] ?? null;
  const data = selected ? await new AssessmentService().forLesson(selected.id, true) : null;
  return (
    <AssessmentBuilder
      lessonId={selected?.id ?? null}
      data={data}
      lessons={lessons.map((lesson) => ({
        id: lesson.id,
        label: `${lesson.chapterLabel} · ${lesson.title}`,
        status: lesson.toProps().status,
        threshold: lesson.passingThreshold,
      }))}
    />
  );
}
