import { z } from "zod";
import { COURSES, YEAR_LEVELS } from "@/config/academics";

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be at most 50 characters.`);

/** Validation ng Student Registration (Tables 10 at 11 ng PDF). Ginagamit sa server action. */
export const registrationSchema = z
  .object({
    firstName: name("First name"),
    middleName: z.string().trim().max(50, "Middle name must be at most 50 characters."),
    lastName: name("Last name"),
    studentNumber: z
      .string()
      .trim()
      .min(4, "Student number is required.")
      .max(20, "Student number must be at most 20 characters.")
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only."),
    course: z.enum(COURSES, { error: "Select your course." }),
    yearLevel: z.enum(YEAR_LEVELS, { error: "Select your year level." }),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username must be at least 3 characters.")
      .max(30, "Username must be at most 30 characters.")
      .regex(/^[a-z0-9._]+$/, "Use letters, numbers, dots and underscores only."),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters.")
      .regex(/[A-Za-z]/, "Password must include a letter.")
      .regex(/[0-9]/, "Password must include a number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match.",
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type RegistrationField = keyof RegistrationInput;
