/** Mga tab ng PIECES Evaluation (hiwalay sa "use client" file para magamit ng Server Component). */
export const EVALUATION_TABS = ["results", "questionnaire", "respondents"] as const;
export type EvaluationTab = (typeof EVALUATION_TABS)[number];
