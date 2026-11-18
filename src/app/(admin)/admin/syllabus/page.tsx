import { Suspense } from "react";
import type { Metadata } from "next";
import SyllabusBuilder from "@/components/syllabus/SyllabusBuilder";
import PageLoading from "@/components/ui/PageLoading";
import { getViewer, requireUser } from "@/lib/auth/session";
import { ContentService } from "@/services/ContentService";
import { SystemService } from "@/services/SystemService";

export const metadata: Metadata = { title: "Syllabus Builder" };

/** Syllabus Builder (Fig. 11). */
export default function SyllabusBuilderPage() {
  return (
    <Suspense fallback={<PageLoading rows={6} />}>
      <SyllabusContent />
    </Suspense>
  );
}

async function SyllabusContent() {
  const admin = await requireUser(["admin"]);
  const content = new ContentService();
  const [course, lessons, viewer, settings] = await Promise.all([content.getCourse(), content.listLessons(), getViewer(admin), new SystemService().getSettings()]);
  return (
    <SyllabusBuilder
      course={course}
      lessons={lessons.map((lesson) => lesson.toDTO())}
      defaultInstructor={viewer.displayName}
      defaultThreshold={settings.defaultThreshold}
    />
  );
}
