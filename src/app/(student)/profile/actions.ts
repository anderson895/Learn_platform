"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/lib/forms";
import { requireUser } from "@/lib/auth/session";
import { changePasswordSchema, fieldErrorsOf, formValues, profileSchema } from "@/lib/validation/student";
import { StudentProfileRepository } from "@/repositories/StudentProfileRepository";
import { AuthService } from "@/services/AuthService";

const PROFILE_FIELDS = ["firstName", "middleName", "lastName", "course", "yearLevel"] as const;

export async function updateProfileAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const user = await requireUser(["student"]);
  const values = formValues(formData, PROFILE_FIELDS);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };
  await new StudentProfileRepository().update(user.id, { ...parsed.data });
  refresh();
  return { status: "success", message: "Profile updated.", values, attempt };
}

export async function changePasswordAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(formValues(formData, ["currentPassword", "newPassword", "confirmPassword"]));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), attempt };
  try {
    const result = await new AuthService().changePassword(user, parsed.data.currentPassword, parsed.data.newPassword);
    if (!result.ok) return { status: "error", message: result.error, fieldErrors: result.fieldErrors, attempt };
  } catch (error) {
    console.error("[change-password]", error);
    return { status: "error", message: "We couldn't change your password. Please try again.", attempt };
  }
  return { status: "success", message: "Password changed.", attempt };
}
