"use server";

import { refresh } from "next/cache";
import type { AccountStatus } from "@/domain/users/User";
import type { FormState } from "@/lib/forms";
import { requireUser } from "@/lib/auth/session";
import { fieldErrorsOf, formValues, profileSchema, studentDetailsSchema } from "@/lib/validation/student";
import { StudentAccountService } from "@/services/StudentAccountService";

const CREATE_FIELDS = ["firstName", "middleName", "lastName", "studentNumber", "course", "yearLevel", "username", "email"] as const;
const UPDATE_FIELDS = ["firstName", "middleName", "lastName", "studentNumber", "course", "yearLevel"] as const;

export type ActionResult = { ok: boolean; message?: string; tempPassword?: string };

const failure = (error: unknown, label: string): FormState => {
  console.error(`[students:${label}]`, error);
  return { status: "error", message: "Something went wrong. Please try again." };
};

export async function createStudentAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const admin = await requireUser(["admin"]);
  const values = formValues(formData, CREATE_FIELDS);
  const parsed = studentDetailsSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };
  try {
    const result = await new StudentAccountService().create(parsed.data, admin.id);
    if (!result.ok) return { status: "error", message: result.error, fieldErrors: result.fieldErrors, values, attempt };
    refresh();
    return { status: "success", attempt, data: { tempPassword: result.data.tempPassword, email: parsed.data.email } };
  } catch (error) {
    return { ...failure(error, "create"), values, attempt };
  }
}

export async function updateStudentAction(uid: string, prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const admin = await requireUser(["admin"]);
  const values = formValues(formData, UPDATE_FIELDS);
  const parsed = profileSchema.extend({ studentNumber: studentDetailsSchema.shape.studentNumber }).safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };
  try {
    const result = await new StudentAccountService().update(uid, parsed.data, admin.id);
    if (!result.ok) return { status: "error", message: result.error, fieldErrors: result.fieldErrors, values, attempt };
    refresh();
    return { status: "success", message: "Student updated.", values, attempt };
  } catch (error) {
    return { ...failure(error, "update"), values, attempt };
  }
}

export async function setStudentStatusAction(uid: string, status: AccountStatus): Promise<ActionResult> {
  const admin = await requireUser(["admin"]);
  try {
    const result = await new StudentAccountService().setStatus(uid, status, admin.id);
    if (!result.ok) return { ok: false, message: result.error };
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[students:status]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function resetStudentPasswordAction(uid: string): Promise<ActionResult> {
  const admin = await requireUser(["admin"]);
  try {
    const result = await new StudentAccountService().resetPassword(uid, admin.id);
    if (!result.ok) return { ok: false, message: result.error };
    return { ok: true, tempPassword: result.data.tempPassword };
  } catch (error) {
    console.error("[students:reset]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
