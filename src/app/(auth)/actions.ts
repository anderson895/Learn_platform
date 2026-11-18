"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { clearSession, getSessionUser } from "@/lib/auth/session";
import { fieldErrorsOf, formValues, loginSchema, registrationSchema, studentDetailsSchema } from "@/lib/validation/student";
import { AuthService } from "@/services/AuthService";

const REGISTER_FIELDS = ["firstName", "middleName", "lastName", "studentNumber", "course", "yearLevel", "username", "email"] as const;

export async function loginAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formValues(formData, ["portal", "identifier"]);
  const parsed = loginSchema.safeParse({ ...values, password: String(formData.get("password") ?? "") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };

  let homePath: string;
  try {
    const result = await new AuthService().login(parsed.data.identifier, parsed.data.password, parsed.data.portal);
    if (!result.ok) return { status: "error", message: result.error, values, attempt };
    homePath = result.data.homePath;
  } catch (error) {
    console.error("[login]", error);
    return { status: "error", message: "We couldn't sign you in right now. Please try again.", values, attempt };
  }
  redirect(homePath);
}

export async function registerAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = formValues(formData, REGISTER_FIELDS);
  const parsed = registrationSchema.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };

  try {
    const details = studentDetailsSchema.parse(parsed.data); // tinatanggal ang password fields
    const result = await new AuthService().registerAndSignIn(details, parsed.data.password);
    if (!result.ok) return { status: "error", message: result.error, fieldErrors: result.fieldErrors, values, attempt };
  } catch (error) {
    console.error("[register]", error);
    return { status: "error", message: "Something went wrong while creating your account. Please try again.", values, attempt };
  }
  redirect("/learn");
}

export async function logoutAction(): Promise<void> {
  const user = await getSessionUser();
  await new AuthService().logout(user?.id ?? null);
  await clearSession();
  redirect("/login");
}
