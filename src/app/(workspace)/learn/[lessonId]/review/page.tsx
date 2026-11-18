import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import ReviewerView from "@/components/workspace/ReviewerView";
import { getViewer } from "@/lib/auth/session";
import { loadLessonForViewer } from "@/lib/lessonAccess";
import { AssessmentService } from "@/services/AssessmentService";

export const metadata: Metadata = { title: "Syntax Reviewer" };

type Params = { params: Promise<{ lessonId: string }> };

/** Syntax Reviewer (Fig. 14). */
export default function ReviewerPage({ params }: Params) {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading reviewer" />
        </Box>
      }
    >
      <Reviewer params={params} />
    </Suspense>
  );
}

async function Reviewer({ params }: Params) {
  const { lessonId } = await params;
  const { user, lesson, progressService, preview } = await loadLessonForViewer(lessonId);
  const [assessments, viewer, progress] = await Promise.all([
    new AssessmentService().forLesson(lesson.id),
    getViewer(user),
    preview ? Promise.resolve(null) : progressService.get(user.id, lesson.id),
  ]);
  if (!assessments.reviewer || assessments.reviewer.questions.length === 0) redirect(`/learn/${lesson.id}`);
  return (
    <ReviewerView
      lesson={{ id: lesson.id, chapterLabel: lesson.chapterLabel, title: lesson.title }}
      reviewer={assessments.reviewer}
      viewerName={viewer.displayName}
      alreadyReviewed={progress?.reviewed ?? false}
    />
  );
}
