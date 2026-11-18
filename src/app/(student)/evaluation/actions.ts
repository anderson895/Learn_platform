"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { piecesAnswerSchema } from "@/lib/validation/evaluation";
import { EvaluationService, type SubmitResult } from "@/services/EvaluationService";

/** Pagsagot sa PIECES Evaluation (students at faculty). */
export async function submitEvaluationAction(input: unknown): Promise<SubmitResult> {
  const user = await requireUser(["student", "admin", "chairman"]);
  const parsed = piecesAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid answers." };
  try {
    const result = await new EvaluationService().submit(user, parsed.data);
    if (result.ok) refresh();
    return result;
  } catch (error) {
    console.error("[evaluation:submit]", error);
    return { ok: false, message: "Could not save your answers. Please try again." };
  }
}
