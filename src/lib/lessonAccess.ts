import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { ContentService } from "@/services/ContentService";
import { ProgressService } from "@/services/ProgressService";

/**
 * Para sa mga page ng lesson: kinukuha ang user at lesson, at sinusuri sa server kung bukas ang lesson.
 * Kapag naka-lock (hindi pa naaabot ang threshold ng naunang lesson), ibinabalik sa Syllabus Board.
 */
export async function loadLessonForViewer(lessonId: string) {
  const user = await requireUser(["student", "admin"]);
  const content = new ContentService();
  const lesson = await content.getLesson(lessonId);
  if (!lesson) notFound();
  const progressService = new ProgressService();
  const access = await progressService.canOpen(user, lesson);
  if (!access.allowed) redirect("/learn?locked=1");
  return { user, lesson, content, progressService, status: access.status, preview: user.role !== "student" };
}
