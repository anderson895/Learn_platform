import { z } from "zod";

const text = (label: string, max: number, min = 1) =>
  z.string().trim().min(min, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);
const optionalText = (label: string, max: number) => z.string().trim().max(max, `${label} must be at most ${max} characters.`);

/** Subject (Table 4) + Syllabus (Table 5). */
export const courseSchema = z.object({
  subjectCode: text("Subject code", 20),
  subjectName: text("Subject name", 100),
  yearLevel: text("Year level", 30),
  academicYear: text("Academic year", 20),
  courseDescription: optionalText("Course description", 3000),
  courseObjectives: optionalText("Course objectives", 3000),
  learningOutcomes: optionalText("Learning outcomes", 3000),
});

export const publishStatusSchema = z.enum(["draft", "published"]);

/** Isang module/lesson ng Syllabus Builder (Fig. 11). Ang topics ay pinaghihiwalay ng kuwit. */
export const lessonSchema = z.object({
  lessonTitle: text("Lesson title", 120),
  topics: z
    .string()
    .transform((value) => value.split(",").map((topic) => topic.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(40, "Each topic must be at most 40 characters.")).max(12, "Use at most 12 topics.")),
  lessonContent: optionalText("Summary", 2000),
  passingThreshold: z.coerce
    .number({ error: "Enter a number from 0 to 100." })
    .int("Use a whole number.")
    .min(0, "Use a number from 0 to 100.")
    .max(100, "Use a number from 0 to 100."),
  instructorName: optionalText("Instructor name", 80),
  status: publishStatusSchema,
});

export const noteSchema = z.object({
  title: text("Title", 120),
  markdown: z.string().max(50000, "Notes must be at most 50,000 characters."),
  lessonId: z
    .string()
    .trim()
    .transform((value) => value || null),
  status: publishStatusSchema,
});

export const snippetSchema = z.object({
  filename: text("File name", 60).regex(/^[A-Za-z0-9_.-]+$/, "Use letters, numbers, dots, dashes and underscores only."),
  code: text("Code", 10000),
});
