import { z } from "zod";
import { CRITERION_ORDER } from "@/domain/evaluation/Pieces";

export const MAX_ITEMS_PER_CRITERION = 10;

const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/, "Invalid question ID."),
  text: z.string().trim().min(1, "Question text is required.").max(300, "Use at most 300 characters."),
});

const criterionSchema = z.object({
  key: z.enum(CRITERION_ORDER as [string, ...string[]]),
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().max(300, "Use at most 300 characters."),
  items: z.array(itemSchema).min(1, "Each criterion needs at least one question.").max(MAX_ITEMS_PER_CRITERION, `Use at most ${MAX_ITEMS_PER_CRITERION} questions per criterion.`),
});

/** Ang na-edit na questionnaire: anim na PIECES criterion sa tamang ayos, at walang dobleng question ID. */
export const questionnaireSchema = z
  .object({
    isOpen: z.boolean(),
    instructions: z.string().trim().min(1, "Instructions are required.").max(2000, "Use at most 2,000 characters."),
    criteria: z.array(criterionSchema).length(CRITERION_ORDER.length),
  })
  .superRefine((value, ctx) => {
    if (value.criteria.some((criterion, index) => criterion.key !== CRITERION_ORDER[index])) {
      ctx.addIssue({ code: "custom", message: "The six PIECES criteria must stay in order.", path: ["criteria"] });
    }
    const ids = value.criteria.flatMap((criterion) => criterion.items.map((item) => item.id));
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Question IDs must be unique.", path: ["criteria"] });
  });

/** Sagot ng respondent: 1 hanggang 5 bawat tanong, at opsyonal na komento. */
export const piecesAnswerSchema = z.object({
  answers: z.record(z.string().max(40), z.number().int().min(1).max(5)),
  comment: z.string().trim().max(1000, "Use at most 1,000 characters.").default(""),
});
