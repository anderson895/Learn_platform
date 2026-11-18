"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { QuizOutcome } from "@/domain/assessment/dto";
import { requireUser } from "@/lib/auth/session";
import { AssessmentService } from "@/services/AssessmentService";
import { ContentService } from "@/services/ContentService";
import { ProgressService } from "@/services/ProgressService";

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

async function guard<T>(label: string, task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    console.error(`[learn:${label}]`, error);
    return { ok: false, message: (error as Error).message || "Something went wrong. Please try again." };
  }
}

/** Sinusuri sa server na bukas ang lesson para sa student (Accomplishment Threshold). */
async function openLesson(lessonId: string) {
  const user = await requireUser(["student", "admin"]);
  const lesson = await new ContentService().getLesson(lessonId);
  if (!lesson) throw new Error("Lesson not found.");
  const access = await new ProgressService().canOpen(user, lesson);
  if (!access.allowed) throw new Error("This lesson is locked. Complete the previous lesson first.");
  return { user, lesson };
}

/** Minamarkahang "in progress" ang lesson kapag binuksan ng student. */
export async function openLessonAction(lessonId: string): Promise<Result<null>> {
  return guard("open", async () => {
    const { user, lesson } = await openLesson(lessonId);
    if (user.role === "student") await new ProgressService().touch(user.id, lesson.id);
    return null;
  });
}

export async function checkSequenceAction(lessonId: string, activityId: string, order: string[]) {
  const parsed = z.array(z.string().max(40)).max(60).safeParse(order);
  if (!parsed.success) return { ok: false as const, message: "Invalid answer." };
  return guard("sequence", async () => {
    const { user } = await openLesson(lessonId);
    return new AssessmentService().checkSequence(user, activityId, parsed.data);
  });
}

export async function submitExerciseAction(lessonId: string, exerciseId: string, code: string) {
  if (code.length > 20000) return { ok: false as const, message: "Your code is too long (max 20,000 characters)." };
  if (!code.trim()) return { ok: false as const, message: "Write your code before submitting." };
  return guard("exercise", async () => {
    const { user } = await openLesson(lessonId);
    const result = await new AssessmentService().submitExercise(user, exerciseId, code);
    refresh();
    return result;
  });
}

export async function revealAnswerAction(lessonId: string, quizId: string, questionId: string) {
  return guard("reveal", async () => {
    await openLesson(lessonId);
    return new AssessmentService().revealReviewerAnswer(quizId, questionId);
  });
}

export async function finishReviewerAction(lessonId: string, quizId: string) {
  return guard("reviewer", async () => {
    const { user } = await openLesson(lessonId);
    await new AssessmentService().finishReviewer(user, quizId);
    return null;
  });
}

export async function startQuizAction(lessonId: string, quizId: string) {
  return guard("start-quiz", async () => {
    const { user } = await openLesson(lessonId);
    return new AssessmentService().startQuiz(user, quizId);
  });
}

const answersSchema = z.record(z.string().max(40), z.number().int().min(0).max(10).nullable());

export async function submitQuizAction(lessonId: string, quizId: string, attemptId: string | null, answers: Record<string, number | null>): Promise<Result<QuizOutcome>> {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, message: "Invalid answers." };
  return guard("submit-quiz", async () => {
    const { user } = await openLesson(lessonId);
    const outcome = await new AssessmentService().submitQuiz(user, quizId, attemptId, parsed.data);
    refresh();
    return outcome;
  });
}

export async function markLessonDoneAction(lessonId: string) {
  return guard("done", async () => {
    const { user, lesson } = await openLesson(lessonId);
    if (user.role !== "student") return false;
    const done = await new ProgressService().markDone(user.id, lesson);
    if (!done) throw new Error("This lesson has a quiz. Pass the quiz to complete it.");
    refresh();
    return true;
  });
}
