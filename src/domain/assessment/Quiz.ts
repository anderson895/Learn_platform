import { Assessment, type EvaluationResult } from "./Assessment";

export type QuizKind = "reviewer" | "quiz";
export type QuestionData = { id: string; prompt: string; code: string; choices: string[] };
export type QuizKey = { answers: Record<string, number> };
export type QuestionResult = { questionId: string; chosen: number | null; correctIndex: number; correct: boolean };
export type QuizResult = EvaluationResult & { correctCount: number; total: number; results: QuestionResult[] };

/** Abstract na tanong; maaaring magdagdag ng ibang uri ng tanong sa hinaharap. */
export abstract class Question {
  constructor(
    public readonly id: string,
    public readonly prompt: string,
    public readonly code: string,
  ) {}
  abstract isCorrect(answer: number | null, correctIndex: number): boolean;
}

export class MultipleChoiceQuestion extends Question {
  constructor(
    id: string,
    prompt: string,
    code: string,
    public readonly choices: string[],
  ) {
    super(id, prompt, code);
  }
  isCorrect(answer: number | null, correctIndex: number): boolean {
    return answer !== null && answer === correctIndex;
  }
  toData(): QuestionData {
    return { id: this.id, prompt: this.prompt, code: this.code, choices: [...this.choices] };
  }
}

/**
 * Syntax Reviewer (formative, Fig. 14) o Summative Quiz (may time limit).
 * Ang score ng summative quiz ang batayan ng Accomplishment Threshold.
 */
export class Quiz extends Assessment<Record<string, number | null>, QuizKey, QuizResult> {
  constructor(
    id: string,
    lessonId: string,
    title: string,
    public readonly kind: QuizKind,
    public readonly timeLimit: number,
    public readonly questions: MultipleChoiceQuestion[],
  ) {
    super(id, lessonId, title);
  }

  get type() {
    return this.kind;
  }
  get isSummative() {
    return this.kind === "quiz";
  }
  get totalItems() {
    return this.questions.length;
  }

  evaluate(answers: Record<string, number | null>, key: QuizKey): QuizResult {
    const results = this.questions.map((question) => {
      const chosen = answers[question.id] ?? null;
      const correctIndex = key.answers[question.id] ?? -1;
      return { questionId: question.id, chosen, correctIndex, correct: question.isCorrect(chosen, correctIndex) };
    });
    const correctCount = results.filter((result) => result.correct).length;
    const score = results.length ? Math.round((correctCount / results.length) * 100) : 0;
    return {
      score,
      correct: results.length > 0 && correctCount === results.length,
      correctCount,
      total: results.length,
      results,
      feedback: `${correctCount} of ${results.length} correct (${score}%).`,
    };
  }
}
