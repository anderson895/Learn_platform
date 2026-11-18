"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/lib/forms";
import { requireUser } from "@/lib/auth/session";
import { accountDetailsSchema, fieldErrorsOf, formValues } from "@/lib/validation/student";
import { AccountService } from "@/services/AccountService";

const FIELDS = ["displayName", "username", "email"] as const;

/** My Account: pagpalit ng sariling pangalan, username at email ng admin. */
export async function updateMyAccountAction(prev: FormState, formData: FormData): Promise<FormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const admin = await requireUser(["admin"]);
  const values = formValues(formData, FIELDS);
  const parsed = accountDetailsSchema.safeParse({ ...values, currentPassword: String(formData.get("currentPassword") ?? "") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values, attempt };
  try {
    const result = await new AccountService().updateOwnAccount(admin, parsed.data);
    if (!result.ok) return { status: "error", message: result.error, fieldErrors: result.fieldErrors, values, attempt };
  } catch (error) {
    console.error("[account]", error);
    return { status: "error", message: "We couldn't save your account. Please try again.", values, attempt };
  }
  refresh();
  return { status: "success", message: "Account details saved.", values: { ...values, username: parsed.data.username, email: parsed.data.email }, attempt };
}
