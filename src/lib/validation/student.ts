import { z } from "zod";
import { COURSES, YEAR_LEVELS } from "@/config/academics";

const name = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(50, `${label} must be at most 50 characters.`);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

/** Personal at academic na impormasyon (Table 10). */
export const profileSchema = z.object({
  firstName: name("First name"),
  middleName: z.string().trim().max(50, "Middle name must be at most 50 characters."),
  lastName: name("Last name"),
  course: z.enum(COURSES, { error: "Select a course." }),
  yearLevel: z.enum(YEAR_LEVELS, { error: "Select a year level." }),
});

/** Lahat ng kailangan para gumawa ng student account, maliban sa password (Tables 10 at 11). */
export const studentDetailsSchema = profileSchema.extend({
  studentNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Student number is required.")
    .max(20, "Student number must be at most 20 characters.")
    .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and dashes only."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be at most 30 characters.")
    .regex(/^[a-z0-9._]+$/, "Use letters, numbers, dots and underscores only."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
});

/** Username at email ng account (Table 11). */
export const loginDetailsSchema = studentDetailsSchema.pick({ username: true, email: true });

/** My Account ng admin/chairman: display name, username at email. Kailangan ang kasalukuyang password kapag papalitan ang email. */
export const accountDetailsSchema = loginDetailsSchema.extend({
  displayName: name("Name").max(80, "Name must be at most 80 characters."),
  currentPassword: z.string(),
});

/** Student Registration (sariling pag-register ng student). */
export const registrationSchema = studentDetailsSchema
  .extend({ password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], error: "Passwords do not match." });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password."), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"], error: "Passwords do not match." })
  .refine((data) => data.newPassword !== data.currentPassword, { path: ["newPassword"], error: "Use a different password." });

export const loginSchema = z.object({
  portal: z.enum(["student", "educator"]),
  identifier: z.string().trim().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type StudentDetailsInput = z.infer<typeof studentDetailsSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;

/** Ginagawang `{ field: "unang error" }` ang zod error, para madaling ipakita sa form. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** Kinukuha ang mga string value ng FormData (walang `$ACTION_` na field). */
export function formValues(formData: FormData, fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
}
