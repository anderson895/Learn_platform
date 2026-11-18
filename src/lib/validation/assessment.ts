import { z } from "zod";

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);
const optional = (label: string, max: number) => z.string().max(max, `${label} must be at most ${max} characters.`);

export const activitySchema = z.object({
  title: text("Title", 120),
  instructions: optional("Instructions", 1000),
  solution: z
    .string()
    .max(5000, "The program must be at most 5,000 characters.")
    .refine((value) => value.split("\n").filter((line) => line.trim()).length >= 2, "Write at least 2 lines (each line becomes a block).")
    .refine((value) => value.split("\n").filter((line) => line.trim()).length <= 30, "Use at most 30 lines."),
});

export const exerciseSchema = z.object({
  title: text("Title", 120),
  instructions: text("Instructions", 4000),
  starterCode: optional("Starter code", 10000),
  modelSolution: optional("Model solution", 10000),
  maxScore: z.coerce.number({ error: "Enter a number." }).int("Use a whole number.").min(1, "Use 1 to 1000.").max(1000, "Use 1 to 1000."),
});

const questionSchema = z
  .object({
    id: z.string().max(40).optional(),
    prompt: text("Question", 500),
    code: optional("Code", 2000),
    choices: z.array(text("Choice", 300)).min(2, "Add at least 2 choices.").max(6, "Use at most 6 choices."),
    correctIndex: z.number().int(),
  })
  .refine((question) => question.correctIndex >= 0 && question.correctIndex < question.choices.length, {
    path: ["correctIndex"],
    error: "Select the correct answer.",
  });

export const quizSchema = z.object({
  title: text("Title", 120),
  timeLimit: z.coerce.number().int("Use whole minutes.").min(0, "Use 0 to 180 minutes.").max(180, "Use 0 to 180 minutes."),
  questions: z.array(questionSchema).min(1, "Add at least 1 question.").max(50, "Use at most 50 questions."),
});

export const gradeSchema = z.object({
  score: z.coerce.number({ error: "Enter a score." }).min(0, "Score cannot be negative."),
  feedback: optional("Feedback", 2000),
});

export type QuizFormInput = z.input<typeof quizSchema>;
