"use server";

import { refresh } from "next/cache";
import type { QuizKind } from "@/domain/assessment/Quiz";
import { requireUser } from "@/lib/auth/session";
import { activitySchema, exerciseSchema, gradeSchema, quizSchema } from "@/lib/validation/assessment";
import { AssessmentService } from "@/services/AssessmentService";

export type BuilderResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

/** Ginagawang `{ "questions.0.prompt": "..." }` ang zod issues, para maipakita sa tamang field. */
function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

async function run(label: string, task: () => Promise<void>): Promise<BuilderResult> {
  try {
    await task();
    refresh();
    return { ok: true };
  } catch (error) {
    console.error(`[assessments:${label}]`, error);
    return { ok: false, message: (error as Error).message || "Something went wrong. Please try again." };
  }
}

export async function saveActivityAction(lessonId: string, id: string | null, input: unknown): Promise<BuilderResult> {
  const admin = await requireUser(["admin"]);
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: issuesToErrors(parsed.error.issues) };
  return run("activity", () => new AssessmentService().saveActivity(id, lessonId, parsed.data, admin.id));
}

export async function saveExerciseAction(lessonId: string, id: string | null, input: unknown): Promise<BuilderResult> {
  const admin = await requireUser(["admin"]);
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: issuesToErrors(parsed.error.issues) };
  return run("exercise", () => new AssessmentService().saveExercise(id, lessonId, parsed.data, admin.id));
}

export async function saveQuizAction(lessonId: string, kind: QuizKind, input: unknown): Promise<BuilderResult> {
  const admin = await requireUser(["admin"]);
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToErrors(parsed.error.issues) };
  return run("quiz", () => new AssessmentService().saveQuiz(lessonId, kind, parsed.data, admin.id));
}

export async function deleteAssessmentAction(kind: "activity" | "codingExercise" | "quiz", id: string): Promise<BuilderResult> {
  const admin = await requireUser(["admin"]);
  return run("delete", () => new AssessmentService().deleteAssessment(kind, id, admin.id));
}

export async function gradeSubmissionAction(submissionId: string, input: unknown): Promise<BuilderResult> {
  const admin = await requireUser(["admin"]);
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: issuesToErrors(parsed.error.issues) };
  return run("grade", () => new AssessmentService().grade(submissionId, parsed.data.score, parsed.data.feedback, admin.id));
}
