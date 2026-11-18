export type AssessmentType = "code_sequencing" | "coding_exercise" | "reviewer" | "quiz";

/** Resulta ng pag-check ng sagot. `score` ay porsyento (0-100), o `null` kapag mano-manong ige-grade. */
export interface EvaluationResult {
  score: number | null;
  correct: boolean | null;
  feedback: string;
}

/**
 * Abstract na base class ng lahat ng assessment (Dual Assessment, Objective 2.5).
 * Hiwalay ang answer key (`TKey`) at hindi ito bahagi ng object na ipinapadala sa browser.
 */
export abstract class Assessment<TAnswer, TKey, TResult extends EvaluationResult = EvaluationResult> {
  constructor(
    public readonly id: string,
    public readonly lessonId: string,
    public readonly title: string,
  ) {}

  abstract get type(): AssessmentType;
  /** Formative (practice) o summative (actual evaluation). */
  abstract get isSummative(): boolean;
  abstract evaluate(answer: TAnswer, key: TKey): TResult;
}
