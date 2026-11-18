import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { Lesson } from "@/domain/content/Lesson";
import { emptyProgress, ProgressPolicy, type LessonProgressProps } from "@/domain/progress/LessonProgress";
import type { User } from "@/domain/users/User";
import { getAdminDb } from "@/lib/firebase/admin";
import { QuizRepository } from "@/repositories/AssessmentRepositories";
import { ProgressRepository } from "@/repositories/ProgressRepositories";
import { toTimestamp } from "@/repositories/firestore";
import type { LessonStatus } from "@/theme/status";
import { ContentService } from "./ContentService";
import { StudentAccountService } from "./StudentAccountService";

export type BoardRow = {
  lessonId: string;
  order: number;
  chapterLabel: string;
  title: string;
  topics: string[];
  mediaCode: string;
  quizCode: string;
  hasVideo: boolean;
  hasQuiz: boolean;
  threshold: number;
  bestQuizScore: number | null;
  status: LessonStatus;
};

export type Board = { rows: BoardRow[]; total: number; completed: number; inProgress: number; notStarted: number; percent: number };

export type Achievement = { id: string; name: string; description: string; earned: boolean };

export type RosterRow = {
  uid: string;
  fullName: string;
  studentNumber: string;
  completed: number;
  total: number;
  percent: number;
  averageQuizScore: number | null;
  accountStatus: "active" | "inactive";
  status: "completed" | "active" | "inactive";
};

/** Progress Monitoring (Fig. 5): threshold, pag-unlock, progress board, roster at achievements. */
export class ProgressService {
  constructor(
    private readonly content = new ContentService(),
    private readonly quizzes = new QuizRepository(),
  ) {}

  private async summativeLessonIds(): Promise<Set<string>> {
    return new Set((await this.quizzes.findWhere("kind", "quiz")).filter((quiz) => quiz.totalItems > 0).map((quiz) => quiz.lessonId));
  }

  /** Syllabus Progress Board (Fig. 15) ng isang student. */
  async board(studentId: string, preloaded?: { lessons: Lesson[]; quizLessons: Set<string> }): Promise<Board> {
    const [lessons, quizLessons, progress] = await Promise.all([
      preloaded?.lessons ?? this.content.listLessons({ publishedOnly: true }),
      preloaded?.quizLessons ?? this.summativeLessonIds(),
      new ProgressRepository(studentId).asMap(),
    ]);
    const statuses = ProgressPolicy.statuses(
      lessons.map((lesson) => ({ lessonId: lesson.id, order: lesson.order, threshold: lesson.passingThreshold })),
      progress,
    );
    const rows = lessons.map((lesson) => {
      const props = lesson.toProps();
      return {
        lessonId: lesson.id,
        order: lesson.order,
        chapterLabel: lesson.chapterLabel,
        title: lesson.title,
        topics: props.topics,
        mediaCode: lesson.mediaCode,
        quizCode: lesson.quizCode,
        hasVideo: lesson.hasVideo(),
        hasQuiz: quizLessons.has(lesson.id),
        threshold: lesson.passingThreshold,
        bestQuizScore: progress.get(lesson.id)?.bestQuizScore ?? null,
        status: statuses.get(lesson.id) ?? "not_started",
      } satisfies BoardRow;
    });
    const completed = rows.filter((row) => row.status === "completed").length;
    const notStarted = rows.filter((row) => row.status === "not_started" || row.status === "locked").length;
    return {
      rows,
      total: rows.length,
      completed,
      notStarted,
      inProgress: rows.length - completed - notStarted,
      percent: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    };
  }

  /** Puwede bang buksan ng user ang lesson? Laging puwede ang admin (preview). */
  async canOpen(user: User, lesson: Lesson): Promise<{ allowed: boolean; status: LessonStatus | null }> {
    if (user.role !== "student") return { allowed: true, status: null };
    if (!lesson.isPublished()) return { allowed: false, status: null };
    const board = await this.board(user.id);
    const status = board.rows.find((row) => row.lessonId === lesson.id)?.status ?? "locked";
    return { allowed: status !== "locked", status };
  }

  async get(studentId: string, lessonId: string): Promise<LessonProgressProps | null> {
    return new ProgressRepository(studentId).findById(lessonId);
  }

  /** Minamarkahang "in progress" ang lesson kapag unang binuksan ng student. */
  async touch(studentId: string, lessonId: string) {
    const repo = new ProgressRepository(studentId);
    const ref = repo.ref(lessonId);
    await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) tx.set(ref, repo.serialize(emptyProgress(lessonId)));
    });
  }

  private async mergeArray(studentId: string, lessonId: string, field: "activitiesDone" | "exercisesSubmitted", value: string) {
    await this.touch(studentId, lessonId);
    await new ProgressRepository(studentId).ref(lessonId).update({ [field]: FieldValue.arrayUnion(value), updatedAt: toTimestamp(new Date()) });
  }

  recordActivity(studentId: string, lessonId: string, activityId: string) {
    return this.mergeArray(studentId, lessonId, "activitiesDone", activityId);
  }

  recordExerciseSubmission(studentId: string, lessonId: string, exerciseId: string) {
    return this.mergeArray(studentId, lessonId, "exercisesSubmitted", exerciseId);
  }

  async markReviewed(studentId: string, lessonId: string) {
    await this.touch(studentId, lessonId);
    await new ProgressRepository(studentId).ref(lessonId).update({ reviewed: true, updatedAt: toTimestamp(new Date()) });
  }

  /**
   * Itinatala ang score ng summative quiz (Accomplishment Threshold).
   * Atomic (transaction): ina-update ang pinakamataas na score, bilang ng attempt, at minamarkahang completed
   * kapag umabot sa threshold, kaya mabubuksan ang susunod na lesson.
   */
  async applyQuizResult(studentId: string, lesson: Lesson, score: number) {
    const repo = new ProgressRepository(studentId);
    const ref = repo.ref(lesson.id);
    return getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = repo.fromDocument(lesson.id, snap.data()) ?? emptyProgress(lesson.id);
      const best = current.bestQuizScore === null ? score : Math.max(current.bestQuizScore, score);
      const reached = ProgressPolicy.meetsThreshold(best, lesson.passingThreshold);
      const wasCompleted = current.status === "completed";
      const next: LessonProgressProps = {
        ...current,
        bestQuizScore: best,
        quizAttempts: current.quizAttempts + 1,
        status: wasCompleted || reached ? "completed" : "in_progress",
        completedAt: wasCompleted ? current.completedAt : reached ? new Date() : null,
        updatedAt: new Date(),
      };
      tx.set(ref, repo.serialize(next));
      return {
        passed: ProgressPolicy.meetsThreshold(score, lesson.passingThreshold),
        best,
        newlyCompleted: !wasCompleted && next.status === "completed",
      };
    });
  }

  /** Para sa lesson na walang summative quiz: minamarkahan ng student na tapos na. */
  async markDone(studentId: string, lesson: Lesson): Promise<boolean> {
    if ((await this.summativeLessonIds()).has(lesson.id)) return false;
    await this.touch(studentId, lesson.id);
    await new ProgressRepository(studentId).ref(lesson.id).update({
      status: "completed",
      completedAt: toTimestamp(new Date()),
      updatedAt: toTimestamp(new Date()),
    });
    return true;
  }

  async hasSummativeQuiz(lessonId: string): Promise<boolean> {
    return (await this.summativeLessonIds()).has(lessonId);
  }

  async achievements(studentId: string): Promise<Achievement[]> {
    const [board, progress] = await Promise.all([this.board(studentId), new ProgressRepository(studentId).findAll()]);
    const activities = progress.reduce((sum, entry) => sum + entry.activitiesDone.length, 0);
    const reviewed = progress.filter((entry) => entry.reviewed).length;
    const exercises = progress.reduce((sum, entry) => sum + entry.exercisesSubmitted.length, 0);
    return [
      { id: "first-steps", name: "First Steps", description: "Complete your first lesson.", earned: board.completed >= 1 },
      { id: "code-builder", name: "Code Builder", description: "Solve 5 code sequencing activities.", earned: activities >= 5 },
      { id: "reviewer", name: "Diligent Reviewer", description: "Finish the Syntax Reviewer of 3 lessons.", earned: reviewed >= 3 },
      { id: "coder", name: "Java Coder", description: "Submit your first coding exercise.", earned: exercises >= 1 },
      { id: "perfect", name: "Perfect Score", description: "Get 100% on a lesson quiz.", earned: progress.some((entry) => entry.bestQuizScore === 100) },
      { id: "halfway", name: "Halfway There", description: "Complete half of the course.", earned: board.total > 0 && board.completed >= Math.ceil(board.total / 2) },
      { id: "course-complete", name: "Course Complete", description: "Complete every lesson of Computer Programming 1.", earned: board.total > 0 && board.completed === board.total },
    ];
  }

  /** Class Roster (Fig. 12): progress ng bawat student. */
  async roster(): Promise<RosterRow[]> {
    const [students, lessons, quizLessons] = await Promise.all([
      new StudentAccountService().list(),
      this.content.listLessons({ publishedOnly: true }),
      this.summativeLessonIds(),
    ]);
    return Promise.all(
      students.map(async (student) => {
        const [board, progress] = await Promise.all([this.board(student.uid, { lessons, quizLessons }), new ProgressRepository(student.uid).findAll()]);
        const scores = progress.map((entry) => entry.bestQuizScore).filter((score): score is number => score !== null);
        const status: RosterRow["status"] = student.status === "inactive" ? "inactive" : board.total > 0 && board.completed === board.total ? "completed" : "active";
        return {
          uid: student.uid,
          fullName: student.fullName,
          studentNumber: student.studentNumber,
          completed: board.completed,
          total: board.total,
          percent: board.percent,
          averageQuizScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          accountStatus: student.status,
          status,
        };
      }),
    );
  }
}
