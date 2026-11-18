import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import QuizView from "@/components/workspace/QuizView";
import { loadLessonForViewer } from "@/lib/lessonAccess";
import { AssessmentService } from "@/services/AssessmentService";

export const metadata: Metadata = { title: "Quiz" };

type Params = { params: Promise<{ lessonId: string }> };

/** Summative Quiz ng lesson (Take Quizzes, Fig. 5). */
export default function QuizPage({ params }: Params) {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading quiz" />
        </Box>
      }
    >
      <QuizContent params={params} />
    </Suspense>
  );
}

async function QuizContent({ params }: Params) {
  const { lessonId } = await params;
  const { user, lesson, progressService, preview } = await loadLessonForViewer(lessonId);
  const assessments = await new AssessmentService().forLesson(lesson.id);
  if (!assessments.quiz || assessments.quiz.questions.length === 0) redirect(`/learn/${lesson.id}`);
  const progress = preview ? null : await progressService.get(user.id, lesson.id);
  return (
    <QuizView
      lesson={{ id: lesson.id, chapterLabel: lesson.chapterLabel, title: lesson.title }}
      quiz={assessments.quiz}
      threshold={lesson.passingThreshold}
      bestScore={progress?.bestQuizScore ?? null}
      attempts={progress?.quizAttempts ?? 0}
      completed={progress?.status === "completed"}
      preview={preview}
    />
  );
}
