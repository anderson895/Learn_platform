"use server";

import { refresh } from "next/cache";
import type { PublishStatus } from "@/domain/content/Lesson";
import type { FormState } from "@/lib/forms";
import { getViewer, requireUser } from "@/lib/auth/session";
import { courseSchema, lessonSchema } from "@/lib/validation/content";
import { fieldErrorsOf, formValues } from "@/lib/validation/student";
import { ContentService } from "@/services/ContentService";
import { SystemService } from "@/services/SystemService";

export type ActionResult = { ok: boolean; message?: string };

const COURSE_FIELDS = ["subjectCode", "subjectName", "yearLevel", "academicYear", "courseDescription", "courseObjectives", "learningOutcomes"] as const;
const LESSON_FIELDS = ["lessonTitle", "topics", "lessonContent", "passingThreshold", "instructorName", "status"] as const;

async function run(label: string, task: () => Promise<void>): Promise<ActionResult> {
  try {
    await task();
    refresh();
    return { ok: true };
  } catch (error) {
    console.error(`[syllabus:${label}]`, error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function saveCourseAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const admin = await requireUser(["admin"]);
  const values = formValues(formData, COURSE_FIELDS);
  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };
  const result = await run("course", () => new ContentService().updateCourse(parsed.data, admin.id));
  return result.ok ? { status: "success", message: "Course details saved.", values, attempt } : { status: "error", message: result.message, values, attempt };
}

export async function saveLessonAction(lessonId: string | null, prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const admin = await requireUser(["admin"]);
  const values = formValues(formData, LESSON_FIELDS);
  const parsed = lessonSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };
  const result = await run("lesson", async () => {
    await new ContentService().saveLesson(lessonId, parsed.data, admin.id);
  });
  return result.ok ? { status: "success", message: "Module saved.", values, attempt } : { status: "error", message: result.message, values, attempt };
}

export async function setLessonStatusAction(lessonId: string, status: PublishStatus): Promise<ActionResult> {
  const admin = await requireUser(["admin"]);
  return run("status", () => new ContentService().setLessonStatus(lessonId, status, admin.id));
}

export async function reorderLessonsAction(orderedIds: string[]): Promise<ActionResult> {
  const admin = await requireUser(["admin"]);
  return run("reorder", () => new ContentService().reorderLessons(orderedIds, admin.id));
}

export async function deleteLessonAction(lessonId: string): Promise<ActionResult> {
  const admin = await requireUser(["admin"]);
  return run("delete", () => new ContentService().deleteLesson(lessonId, admin.id));
}

export async function seedSampleLessonsAction(): Promise<ActionResult> {
  const admin = await requireUser(["admin"]);
  const viewer = await getViewer(admin);
  return run("seed", async () => {
    const { defaultThreshold } = await new SystemService().getSettings();
    await new ContentService().seedSampleLessons(viewer.displayName, admin.id, defaultThreshold);
  });
}
