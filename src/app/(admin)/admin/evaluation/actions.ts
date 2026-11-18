"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { questionnaireSchema } from "@/lib/validation/evaluation";
import type { Questionnaire } from "@/domain/evaluation/Pieces";
import { EvaluationService } from "@/services/EvaluationService";

export type EvaluationActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string };

async function run<T>(label: string, task: () => Promise<T>): Promise<EvaluationActionResult<T>> {
  try {
    const data = await task();
    refresh();
    return { ok: true, data };
  } catch (error) {
    console.error(`[evaluation:${label}]`, error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function saveQuestionnaireAction(input: unknown): Promise<EvaluationActionResult> {
  const admin = await requireUser(["admin"]);
  const parsed = questionnaireSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the questionnaire." };
  return run("save", () => new EvaluationService().saveQuestionnaire(parsed.data as Questionnaire, admin.id).then(() => null));
}

export async function setEvaluationOpenAction(isOpen: unknown): Promise<EvaluationActionResult> {
  const admin = await requireUser(["admin"]);
  const parsed = z.boolean().safeParse(isOpen);
  if (!parsed.success) return { ok: false, message: "Invalid value." };
  return run("open", () => new EvaluationService().setOpen(parsed.data, admin.id).then(() => null));
}

export async function resetQuestionnaireAction(): Promise<EvaluationActionResult> {
  const admin = await requireUser(["admin"]);
  return run("reset", () => new EvaluationService().resetQuestionnaire(admin.id).then(() => null));
}

export async function clearResponsesAction(): Promise<EvaluationActionResult<number>> {
  const admin = await requireUser(["admin"]);
  return run("clear", () => new EvaluationService().clearResponses(admin.id));
}
