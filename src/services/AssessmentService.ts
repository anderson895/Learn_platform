import "server-only";
import { randomUUID } from "node:crypto";
import { CodeSequencingActivity } from "@/domain/assessment/CodeSequencingActivity";
import { CodingExercise } from "@/domain/assessment/CodingExercise";
import type { ActivityDTO, ExerciseDTO, ExerciseSubmissionDTO, GradingRow, LessonAssessments, QuizDTO, QuizOutcome } from "@/domain/assessment/dto";
import { MultipleChoiceQuestion, Quiz, type QuizKind } from "@/domain/assessment/Quiz";
import type { User } from "@/domain/users/User";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ActivityRepository,
  AnswerKeyRepository,
  CodingExerciseRepository,
  QuizRepository,
} from "@/repositories/AssessmentRepositories";
import { AuditLogRepository, type AuditLogEntry } from "@/repositories/AuditLogRepository";
import { SubmissionRepository, type Submission } from "@/repositories/ProgressRepositories";
import { toTimestamp } from "@/repositories/firestore";
import { ContentService } from "./ContentService";
import { ProgressService } from "./ProgressService";
import { StudentAccountService } from "./StudentAccountService";

const shortId = () => randomUUID().replace(/-/g, "").slice(0, 10);
/** Palugit sa time limit para sa bagal ng network. */
const GRACE_MS = 60_000;

const activityDTO = (activity: CodeSequencingActivity): ActivityDTO => ({
  id: activity.id,
  lessonId: activity.lessonId,
  title: activity.title,
  instructions: activity.instructions,
  blocks: activity.blocks,
  order: activity.order,
});
const exerciseDTO = (exercise: CodingExercise): ExerciseDTO => ({
  id: exercise.id,
  lessonId: exercise.lessonId,
  title: exercise.title,
  instructions: exercise.instructions,
  starterCode: exercise.starterCode,
  maxScore: exercise.maxScore,
  language: exercise.programmingLanguage,
});
const quizDTO = (quiz: Quiz): QuizDTO => ({
  id: quiz.id,
  lessonId: quiz.lessonId,
  title: quiz.title,
  kind: quiz.kind,
  timeLimit: quiz.timeLimit,
  questions: quiz.questions.map((question) => question.toData()),
});

export type QuestionInput = { id?: string; prompt: string; code: string; choices: string[]; correctIndex: number };

/** Assessment Management (Fig. 5): Dual Assessment ng bawat lesson. Sa server lang binabasa ang answer keys. */
export class AssessmentService {
  constructor(
    private readonly activities = new ActivityRepository(),
    private readonly exercises = new CodingExerciseRepository(),
    private readonly quizzes = new QuizRepository(),
    private readonly keys = new AnswerKeyRepository(),
    private readonly submissions = new SubmissionRepository(),
    private readonly progress = new ProgressService(),
    private readonly content = new ContentService(),
    private readonly logs = new AuditLogRepository(),
  ) {}

  // ── Pagbasa ────────────────────────────────────────────────────────────────

  /** Lahat ng assessment ng lesson. Kapag `withKeys`, kasama ang mga sagot (para sa admin lang). */
  async forLesson(lessonId: string, withKeys = false): Promise<LessonAssessments> {
    const [activities, exercises, quizzes] = await Promise.all([
      this.activities.listByLesson(lessonId),
      this.exercises.listByLesson(lessonId),
      this.quizzes.listByLesson(lessonId),
    ]);
    const result: LessonAssessments = {
      activities: activities.map(activityDTO),
      exercises: exercises.map(exerciseDTO),
      reviewer: quizzes.find((quiz) => quiz.kind === "reviewer") ? quizDTO(quizzes.find((quiz) => quiz.kind === "reviewer")!) : null,
      quiz: quizzes.find((quiz) => quiz.kind === "quiz") ? quizDTO(quizzes.find((quiz) => quiz.kind === "quiz")!) : null,
    };
    if (!withKeys) return result;

    const ids = [...result.activities.map((a) => a.id), ...result.exercises.map((e) => e.id), result.reviewer?.id, result.quiz?.id].filter(Boolean) as string[];
    const keys = new Map((await Promise.all(ids.map((id) => this.keys.findById(id)))).filter(Boolean).map((key) => [key!.id, key!]));
    for (const activity of result.activities) {
      const order = keys.get(activity.id)?.correctOrder ?? [];
      const byId = new Map(activity.blocks.map((block) => [block.id, block.code]));
      activity.solution = order.map((id) => byId.get(id) ?? "").join("\n");
    }
    for (const exercise of result.exercises) exercise.modelSolution = keys.get(exercise.id)?.modelSolution ?? "";
    for (const quiz of [result.reviewer, result.quiz]) if (quiz) quiz.answers = keys.get(quiz.id)?.answers ?? {};
    return result;
  }

  // ── Admin: Code Sequencing ─────────────────────────────────────────────────

  async saveActivity(id: string | null, lessonId: string, input: { title: string; instructions: string; solution: string }, actorUid: string) {
    const { blocks, key } = CodeSequencingActivity.fromSolution(input.solution, shortId);
    if (blocks.length < 2) throw new Error("A code sequencing activity needs at least 2 lines of code.");
    let activityId = id;
    if (id) {
      await this.activities.update(id, { activityTitle: input.title, instructions: input.instructions, blocks });
    } else {
      const order = (await this.activities.listByLesson(lessonId)).length + 1;
      activityId = await this.activities.create(new CodeSequencingActivity("", lessonId, input.title, input.instructions, blocks, order));
    }
    await this.keys.create({ id: activityId!, refType: "activity", correctOrder: key.correctOrder }, activityId!);
    await this.log(actorUid, id ? "update" : "create", `activities/${activityId}`);
  }

  // ── Admin: Coding Exercise ────────────────────────────────────────────────

  async saveExercise(
    id: string | null,
    lessonId: string,
    input: { title: string; instructions: string; starterCode: string; modelSolution: string; maxScore: number },
    actorUid: string,
  ) {
    let exerciseId = id;
    if (id) {
      await this.exercises.update(id, { exerciseTitle: input.title, instructions: input.instructions, starterCode: input.starterCode, maxScore: input.maxScore });
    } else {
      exerciseId = await this.exercises.create(new CodingExercise("", lessonId, input.title, input.instructions, input.starterCode, input.maxScore));
    }
    await this.keys.create({ id: exerciseId!, refType: "codingExercise", modelSolution: input.modelSolution }, exerciseId!);
    await this.log(actorUid, id ? "update" : "create", `codingExercises/${exerciseId}`);
  }

  // ── Admin: Reviewer / Quiz (isa bawat lesson) ─────────────────────────────

  async saveQuiz(lessonId: string, kind: QuizKind, input: { title: string; timeLimit: number; questions: QuestionInput[] }, actorUid: string) {
    const questions = input.questions.map((question) => new MultipleChoiceQuestion(question.id || shortId(), question.prompt, question.code, question.choices));
    const answers = Object.fromEntries(questions.map((question, index) => [question.id, input.questions[index].correctIndex]));
    const existing = (await this.quizzes.listByLesson(lessonId)).find((quiz) => quiz.kind === kind);
    let quizId = existing?.id ?? null;
    const quiz = new Quiz(quizId ?? "", lessonId, input.title, kind, kind === "quiz" ? input.timeLimit : 0, questions);
    if (quizId) {
      await this.quizzes.update(quizId, {
        quizTitle: quiz.title,
        timeLimit: quiz.timeLimit,
        totalItems: quiz.totalItems,
        questions: questions.map((question) => question.toData()),
      });
    } else {
      quizId = await this.quizzes.create(quiz);
    }
    await this.keys.create({ id: quizId, refType: "quiz", answers }, quizId);
    await this.log(actorUid, existing ? "update" : "create", `quizzes/${quizId}`);
  }

  /** Binubura ang activity, exercise o quiz kasama ang answer key at mga submission nito. */
  async deleteAssessment(kind: "activity" | "codingExercise" | "quiz", id: string, actorUid: string) {
    const db = getAdminDb();
    const collection = kind === "activity" ? "activities" : kind === "codingExercise" ? "codingExercises" : "quizzes";
    const subs = await db.collection("submissions").where("refId", "==", id).get();
    const batch = db.batch();
    subs.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection(collection).doc(id));
    batch.delete(db.collection("answerKeys").doc(id));
    await batch.commit();
    await this.log(actorUid, "delete", `${collection}/${id}`);
  }

  // ── Student: Code Sequencing ──────────────────────────────────────────────

  async checkSequence(user: User, activityId: string, order: string[]) {
    const [activity, key] = await Promise.all([this.activities.findById(activityId), this.keys.findById(activityId)]);
    if (!activity || !key?.correctOrder) throw new Error("Activity not found.");
    const result = activity.evaluate(order, { correctOrder: key.correctOrder });
    if (user.role === "student") {
      await this.upsertSubmission(user.id, activity.lessonId, "activity", activityId, {
        submission: JSON.stringify(order),
        score: result.score,
        maxScore: 100,
        completionStatus: "completed",
        passed: result.correct,
        feedback: result.feedback,
      });
      if (result.correct) await this.progress.recordActivity(user.id, activity.lessonId, activityId);
    }
    return result;
  }

  // ── Student: Coding Exercise ──────────────────────────────────────────────

  async submitExercise(user: User, exerciseId: string, code: string) {
    const exercise = await this.exercises.findById(exerciseId);
    if (!exercise) throw new Error("Exercise not found.");
    const result = exercise.evaluate();
    if (user.role !== "student") return { ...result, preview: true };
    const previous = await this.submissions.findForStudentRef(user.id, exerciseId);
    const pending = previous.find((submission) => submission.completionStatus === "submitted");
    const now = new Date();
    if (pending) {
      await this.submissions.update(pending.id, { solutionCode: code, submittedAt: toTimestamp(now), feedback: "" });
    } else {
      await this.submissions.create(this.newSubmission(user.id, exercise.lessonId, "codingExercise", exerciseId, { solutionCode: code, maxScore: exercise.maxScore, completionStatus: "submitted", submittedAt: now }));
    }
    await this.progress.recordExerciseSubmission(user.id, exercise.lessonId, exerciseId);
    return { ...result, preview: false };
  }

  async exerciseSubmissions(studentId: string, exerciseIds: string[]): Promise<Record<string, ExerciseSubmissionDTO>> {
    const entries = await Promise.all(
      exerciseIds.map(async (id) => {
        const latest = (await this.submissions.findForStudentRef(studentId, id)).sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))[0];
        if (!latest) return null;
        return [
          id,
          {
            id: latest.id,
            status: latest.completionStatus === "graded" ? "graded" : "submitted",
            score: latest.score,
            maxScore: latest.maxScore,
            feedback: latest.feedback,
            code: latest.solutionCode,
            submittedAt: latest.submittedAt?.toISOString() ?? null,
          } satisfies ExerciseSubmissionDTO,
        ] as const;
      }),
    );
    return Object.fromEntries(entries.filter(Boolean) as [string, ExerciseSubmissionDTO][]);
  }

  // ── Student: Syntax Reviewer ──────────────────────────────────────────────

  /** "Reveal Answer" ng Syntax Reviewer (formative lang; hindi pinapayagan sa summative quiz). */
  async revealReviewerAnswer(quizId: string, questionId: string): Promise<number> {
    const [quiz, key] = await Promise.all([this.quizzes.findById(quizId), this.keys.findById(quizId)]);
    if (!quiz || quiz.kind !== "reviewer") throw new Error("Answers can only be revealed in the Syntax Reviewer.");
    return key?.answers?.[questionId] ?? -1;
  }

  async finishReviewer(user: User, quizId: string) {
    const quiz = await this.quizzes.findById(quizId);
    if (!quiz || quiz.kind !== "reviewer") throw new Error("Reviewer not found.");
    if (user.role === "student") await this.progress.markReviewed(user.id, quiz.lessonId);
  }

  // ── Student: Summative Quiz ───────────────────────────────────────────────

  /** Sinisimulan ang quiz at itinatala sa server ang oras ng pagsisimula (para sa time limit). */
  async startQuiz(user: User, quizId: string): Promise<{ attemptId: string | null; deadline: number | null }> {
    const quiz = await this.quizzes.findById(quizId);
    if (!quiz || quiz.kind !== "quiz") throw new Error("Quiz not found.");
    const limitMs = quiz.timeLimit > 0 ? quiz.timeLimit * 60_000 : null;
    if (user.role !== "student") return { attemptId: null, deadline: limitMs ? Date.now() + limitMs : null };

    const open = (await this.submissions.findForStudentRef(user.id, quizId)).find((submission) => submission.completionStatus === "in_progress");
    if (open && (!limitMs || open.startedAt.getTime() + limitMs + GRACE_MS > Date.now())) {
      return { attemptId: open.id, deadline: limitMs ? open.startedAt.getTime() + limitMs : null };
    }
    if (open) await this.submissions.update(open.id, { completionStatus: "completed", score: 0, feedback: "Time expired.", submittedAt: toTimestamp(new Date()) });
    const startedAt = new Date();
    const attemptId = await this.submissions.create(this.newSubmission(user.id, quiz.lessonId, "quiz", quizId, { maxScore: 100, completionStatus: "in_progress", startedAt }));
    return { attemptId, deadline: limitMs ? startedAt.getTime() + limitMs : null };
  }

  async submitQuiz(user: User, quizId: string, attemptId: string | null, answers: Record<string, number | null>): Promise<QuizOutcome> {
    const [quiz, key] = await Promise.all([this.quizzes.findById(quizId), this.keys.findById(quizId)]);
    if (!quiz || quiz.kind !== "quiz" || !key?.answers) throw new Error("Quiz not found.");
    const lesson = await this.content.getLesson(quiz.lessonId);
    if (!lesson) throw new Error("Lesson not found.");
    const result = quiz.evaluate(answers, { answers: key.answers });
    const score = result.score ?? 0;
    const base = { score, correctCount: result.correctCount, total: result.total, threshold: lesson.passingThreshold, results: result.results };

    if (user.role !== "student") {
      return { ...base, passed: score >= lesson.passingThreshold, best: score, newlyCompleted: false, preview: true };
    }

    const attempt = attemptId ? await this.submissions.findById(attemptId) : null;
    if (!attempt || attempt.studentId !== user.id || attempt.refId !== quizId || attempt.completionStatus !== "in_progress") {
      throw new Error("This quiz attempt is no longer active. Please start the quiz again.");
    }
    const late = quiz.timeLimit > 0 && Date.now() > attempt.startedAt.getTime() + quiz.timeLimit * 60_000 + GRACE_MS;
    const finalScore = late ? 0 : score;
    await this.submissions.update(attempt.id, {
      submission: JSON.stringify(answers),
      details: JSON.stringify(result.results),
      score: finalScore,
      passed: finalScore >= lesson.passingThreshold,
      completionStatus: "completed",
      feedback: late ? "Submitted after the time limit." : result.feedback,
      submittedAt: toTimestamp(new Date()),
    });
    const applied = await this.progress.applyQuizResult(user.id, lesson, finalScore);
    return { ...base, score: finalScore, passed: applied.passed, best: applied.best, newlyCompleted: applied.newlyCompleted, preview: false };
  }

  async quizHistory(studentId: string, quizId: string) {
    const attempts = (await this.submissions.findForStudentRef(studentId, quizId)).filter((submission) => submission.completionStatus === "completed");
    return attempts.map((attempt) => ({ score: attempt.score ?? 0, submittedAt: attempt.submittedAt?.toISOString() ?? null })).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  }

  // ── Admin: Grading ────────────────────────────────────────────────────────

  async gradingQueue(): Promise<GradingRow[]> {
    const [subs, students, lessons, exercises] = await Promise.all([
      this.submissions.findWhere("refType", "codingExercise"),
      new StudentAccountService().list(),
      this.content.listLessons(),
      this.exercises.findAll(),
    ]);
    const studentById = new Map(students.map((student) => [student.uid, student]));
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const keys = new Map((await Promise.all(exercises.map((exercise) => this.keys.findById(exercise.id)))).filter(Boolean).map((key) => [key!.id, key!]));
    return subs
      .filter((submission) => submission.completionStatus === "submitted" || submission.completionStatus === "graded")
      .map((submission) => {
        const lesson = lessonById.get(submission.lessonId);
        const exercise = exerciseById.get(submission.refId);
        return {
          id: submission.id,
          studentName: studentById.get(submission.studentId)?.fullName ?? "Unknown student",
          studentNumber: studentById.get(submission.studentId)?.studentNumber ?? "",
          lessonLabel: lesson ? `${lesson.chapterLabel} · ${lesson.title}` : "Deleted lesson",
          exerciseTitle: exercise?.title ?? "Deleted exercise",
          instructions: exercise?.instructions ?? "",
          modelSolution: keys.get(submission.refId)?.modelSolution ?? "",
          code: submission.solutionCode,
          status: submission.completionStatus === "graded" ? ("graded" as const) : ("submitted" as const),
          score: submission.score,
          maxScore: submission.maxScore,
          feedback: submission.feedback,
          submittedAt: submission.submittedAt?.toISOString() ?? null,
        };
      })
      .sort((a, b) => (a.status === b.status ? (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "") : a.status === "submitted" ? -1 : 1));
  }

  async grade(submissionId: string, score: number, feedback: string, actorUid: string) {
    const submission = await this.submissions.findById(submissionId);
    if (!submission || submission.refType !== "codingExercise") throw new Error("Submission not found.");
    if (score < 0 || score > submission.maxScore) throw new Error(`Score must be from 0 to ${submission.maxScore}.`);
    await this.submissions.update(submissionId, { score, feedback, completionStatus: "graded", gradedBy: actorUid, gradedAt: toTimestamp(new Date()) });
    await this.log(actorUid, "update", `submissions/${submissionId}:grade`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private newSubmission(
    studentId: string,
    lessonId: string,
    refType: Submission["refType"],
    refId: string,
    patch: Partial<Submission>,
  ): Submission {
    return {
      id: "",
      studentId,
      lessonId,
      refType,
      refId,
      submission: "",
      solutionCode: "",
      score: null,
      maxScore: 100,
      completionStatus: "in_progress",
      passed: null,
      feedback: "",
      details: "",
      gradedBy: null,
      startedAt: new Date(),
      submittedAt: null,
      gradedAt: null,
      ...patch,
    };
  }

  /** Isa lang ang submission ng student bawat activity (pinapalitan ang dati). */
  private async upsertSubmission(
    studentId: string,
    lessonId: string,
    refType: Submission["refType"],
    refId: string,
    patch: Pick<Submission, "submission" | "score" | "maxScore" | "completionStatus" | "passed" | "feedback">,
  ) {
    const existing = (await this.submissions.findForStudentRef(studentId, refId))[0];
    const now = new Date();
    if (existing) {
      await this.submissions.update(existing.id, { ...patch, submittedAt: toTimestamp(now) });
    } else {
      await this.submissions.create(this.newSubmission(studentId, lessonId, refType, refId, { ...patch, submittedAt: now }));
    }
  }

  private async log(uid: string, action: AuditLogEntry["action"], target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
