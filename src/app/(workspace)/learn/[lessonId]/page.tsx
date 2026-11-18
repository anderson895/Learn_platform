import { Suspense } from "react";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import WorkspaceView from "@/components/workspace/WorkspaceView";
import { deliveryUrl } from "@/domain/content/Media";
import { getViewer } from "@/lib/auth/session";
import { loadLessonForViewer } from "@/lib/lessonAccess";
import { AssessmentService } from "@/services/AssessmentService";

export const metadata: Metadata = { title: "Workspace" };

type Params = { params: Promise<{ lessonId: string }> };

/** Student Workspace (Fig. 13). */
export default function LessonWorkspacePage({ params }: Params) {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <CircularProgress aria-label="Loading lesson" />
        </Box>
      }
    >
      <Workspace params={params} />
    </Suspense>
  );
}

async function Workspace({ params }: Params) {
  const { lessonId } = await params;
  const { user, lesson, content, progressService, status, preview } = await loadLessonForViewer(lessonId);
  const assessmentService = new AssessmentService();
  const [note, assessments, viewer, progress] = await Promise.all([
    content.getPublishedNote(lesson),
    assessmentService.forLesson(lesson.id),
    getViewer(user),
    preview ? Promise.resolve(null) : progressService.get(user.id, lesson.id),
  ]);
  const exerciseSubmissions = preview ? {} : await assessmentService.exerciseSubmissions(user.id, assessments.exercises.map((exercise) => exercise.id));
  const props = lesson.toProps();

  return (
    <WorkspaceView
      lesson={{
        id: lesson.id,
        order: lesson.order,
        chapterLabel: lesson.chapterLabel,
        title: lesson.title,
        topics: props.topics,
        instructorName: props.instructorName,
        summary: props.lessonContent,
        videoUrl: props.videoFile ? deliveryUrl(props.videoFile.secureUrl) : null,
        audioUrl: props.audioFile ? deliveryUrl(props.audioFile.secureUrl) : null,
      }}
      notes={note?.markdown ?? null}
      assessments={assessments}
      exerciseSubmissions={exerciseSubmissions}
      progress={{
        // Ang pagbukas ng lesson ay nagsisimula nito, kaya "In Progress" na ang dating "Not Started".
        status: preview ? null : status === "not_started" || !status ? "in_progress" : status,
        activitiesDone: progress?.activitiesDone ?? [],
        reviewed: progress?.reviewed ?? false,
        bestQuizScore: progress?.bestQuizScore ?? null,
      }}
      viewerName={viewer.displayName}
      hasQuiz={Boolean(assessments.quiz && assessments.quiz.questions.length > 0)}
      threshold={lesson.passingThreshold}
      preview={preview}
    />
  );
}
