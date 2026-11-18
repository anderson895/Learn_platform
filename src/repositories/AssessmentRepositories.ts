import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { CodeSequencingActivity, type CodeBlock } from "@/domain/assessment/CodeSequencingActivity";
import { CodingExercise } from "@/domain/assessment/CodingExercise";
import { MultipleChoiceQuestion, Quiz, type QuestionData, type QuizKind } from "@/domain/assessment/Quiz";
import { BaseRepository } from "./BaseRepository";
import { toTimestamp } from "./firestore";

// ── activities/{id} (Table 7, content) ──────────────────────────────────────

type ActivityDocument = {
  lessonId: string;
  activityTitle: string;
  instructions: string;
  activityType: "code_sequencing";
  blocks: CodeBlock[];
  order: number;
  createdAt: Timestamp;
};

export class ActivityRepository extends BaseRepository<CodeSequencingActivity, ActivityDocument> {
  protected readonly collectionName = "activities";

  async listByLesson(lessonId: string) {
    return (await this.findWhere("lessonId", lessonId)).sort((a, b) => a.order - b.order);
  }

  protected toEntity(id: string, data: ActivityDocument) {
    return new CodeSequencingActivity(id, data.lessonId, data.activityTitle, data.instructions, data.blocks ?? [], data.order ?? 1);
  }

  protected toDocument(activity: CodeSequencingActivity): ActivityDocument {
    return {
      lessonId: activity.lessonId,
      activityTitle: activity.title,
      instructions: activity.instructions,
      activityType: "code_sequencing",
      blocks: activity.blocks,
      order: activity.order,
      createdAt: toTimestamp(new Date()),
    };
  }
}

// ── codingExercises/{id} (Table 9, content) ─────────────────────────────────

type CodingExerciseDocument = {
  lessonId: string;
  exerciseTitle: string;
  programmingLanguage: string;
  instructions: string;
  starterCode: string;
  maxScore: number;
  createdAt: Timestamp;
};

export class CodingExerciseRepository extends BaseRepository<CodingExercise, CodingExerciseDocument> {
  protected readonly collectionName = "codingExercises";

  listByLesson(lessonId: string) {
    return this.findWhere("lessonId", lessonId);
  }

  protected toEntity(id: string, data: CodingExerciseDocument) {
    return new CodingExercise(id, data.lessonId, data.exerciseTitle, data.instructions, data.starterCode ?? "", data.maxScore ?? 100, data.programmingLanguage ?? "Java");
  }

  protected toDocument(exercise: CodingExercise): CodingExerciseDocument {
    return {
      lessonId: exercise.lessonId,
      exerciseTitle: exercise.title,
      programmingLanguage: exercise.programmingLanguage,
      instructions: exercise.instructions,
      starterCode: exercise.starterCode,
      maxScore: exercise.maxScore,
      createdAt: toTimestamp(new Date()),
    };
  }
}

// ── quizzes/{id} (Table 8, content) ─────────────────────────────────────────

type QuizDocument = {
  lessonId: string;
  quizTitle: string;
  kind: QuizKind;
  timeLimit: number;
  totalItems: number;
  questions: QuestionData[];
  createdAt: Timestamp;
};

export class QuizRepository extends BaseRepository<Quiz, QuizDocument> {
  protected readonly collectionName = "quizzes";

  listByLesson(lessonId: string) {
    return this.findWhere("lessonId", lessonId);
  }

  protected toEntity(id: string, data: QuizDocument) {
    const questions = (data.questions ?? []).map((q) => new MultipleChoiceQuestion(q.id, q.prompt, q.code ?? "", q.choices ?? []));
    return new Quiz(id, data.lessonId, data.quizTitle, data.kind, data.timeLimit ?? 0, questions);
  }

  protected toDocument(quiz: Quiz): QuizDocument {
    return {
      lessonId: quiz.lessonId,
      quizTitle: quiz.title,
      kind: quiz.kind,
      timeLimit: quiz.timeLimit,
      totalItems: quiz.totalItems,
      questions: quiz.questions.map((question) => question.toData()),
      createdAt: toTimestamp(new Date()),
    };
  }
}

// ── answerKeys/{refId}: server lang ─────────────────────────────────────────

export type AnswerKey = {
  id: string;
  refType: "activity" | "codingExercise" | "quiz";
  correctOrder?: string[];
  answers?: Record<string, number>;
  modelSolution?: string;
};
type AnswerKeyDocument = Omit<AnswerKey, "id">;

export class AnswerKeyRepository extends BaseRepository<AnswerKey, AnswerKeyDocument> {
  protected readonly collectionName = "answerKeys";
  protected toEntity(id: string, data: AnswerKeyDocument): AnswerKey {
    return { id, ...data };
  }
  protected toDocument({ id: _id, ...data }: AnswerKey): AnswerKeyDocument {
    return JSON.parse(JSON.stringify(data)); // tinatanggal ang mga undefined na field
  }
}
