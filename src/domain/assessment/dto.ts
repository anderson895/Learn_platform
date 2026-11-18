import type { CodeBlock } from "./CodeSequencingActivity";
import type { QuestionData, QuestionResult, QuizKind } from "./Quiz";

/** Plain na data para sa Client Components. Ang mga `?` na field ay para lang sa admin (answer keys). */
export type ActivityDTO = { id: string; lessonId: string; title: string; instructions: string; blocks: CodeBlock[]; order: number; solution?: string };
export type ExerciseDTO = { id: string; lessonId: string; title: string; instructions: string; starterCode: string; maxScore: number; language: string; modelSolution?: string };
export type QuizDTO = { id: string; lessonId: string; title: string; kind: QuizKind; timeLimit: number; questions: QuestionData[]; answers?: Record<string, number> };

export type LessonAssessments = { activities: ActivityDTO[]; exercises: ExerciseDTO[]; reviewer: QuizDTO | null; quiz: QuizDTO | null };

export type ExerciseSubmissionDTO = { id: string; status: "submitted" | "graded"; score: number | null; maxScore: number; feedback: string; code: string; submittedAt: string | null };

export type QuizOutcome = {
  score: number;
  correctCount: number;
  total: number;
  passed: boolean;
  threshold: number;
  best: number;
  newlyCompleted: boolean;
  preview: boolean;
  results: QuestionResult[];
};

export type GradingRow = {
  id: string;
  studentName: string;
  studentNumber: string;
  lessonLabel: string;
  exerciseTitle: string;
  code: string;
  instructions: string;
  modelSolution: string;
  status: "submitted" | "graded";
  score: number | null;
  maxScore: number;
  feedback: string;
  submittedAt: string | null;
};
