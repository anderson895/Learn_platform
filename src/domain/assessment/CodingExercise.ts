import { Assessment, type EvaluationResult } from "./Assessment";

export type CodingKey = { modelSolution: string };

/**
 * Coding Exercise / Assignment: isusulat ng student ang Java code.
 * Walang compiler at walang automatic grading (Scope ng PDF), kaya ang instructor ang magbibigay ng score.
 */
export class CodingExercise extends Assessment<string, CodingKey> {
  constructor(
    id: string,
    lessonId: string,
    title: string,
    public readonly instructions: string,
    public readonly starterCode: string,
    public readonly maxScore: number,
    public readonly programmingLanguage = "Java",
  ) {
    super(id, lessonId, title);
  }

  get type() {
    return "coding_exercise" as const;
  }
  get isSummative() {
    return false;
  }

  evaluate(): EvaluationResult {
    return { score: null, correct: null, feedback: "Submitted. Your instructor will review and grade your code." };
  }
}
