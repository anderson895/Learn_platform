import "server-only";
import { QuizRepository } from "@/repositories/AssessmentRepositories";
import { NoteRepository } from "@/repositories/NoteRepository";
import { SubmissionRepository } from "@/repositories/ProgressRepositories";
import { ContentService } from "./ContentService";
import { StudentAccountService } from "./StudentAccountService";

export type DashboardOverview = {
  totalLessons: number;
  lessonsWithVideo: number;
  publishedNotes: number;
  activeStudents: number;
  lessonsWithQuiz: number;
  pendingSubmissions: number;
  nextToRecord: string | null;
  nextToWrite: string | null;
};

/** Mga bilang sa Admin Dashboard (Fig. 8). */
export class DashboardService {
  constructor(
    private readonly content = new ContentService(),
    private readonly notes = new NoteRepository(),
    private readonly quizzes = new QuizRepository(),
    private readonly submissions = new SubmissionRepository(),
    private readonly students = new StudentAccountService(),
  ) {}

  async overview(): Promise<DashboardOverview> {
    const [lessons, notes, quizzes, coding, students] = await Promise.all([
      this.content.listLessons(),
      this.notes.findAll(),
      this.quizzes.findWhere("kind", "quiz"),
      this.submissions.findWhere("refType", "codingExercise"),
      this.students.list(),
    ]);
    const quizLessons = new Set(quizzes.filter((quiz) => quiz.totalItems > 0).map((quiz) => quiz.lessonId));
    const label = (lesson: (typeof lessons)[number] | undefined) => (lesson ? `Lesson ${lesson.order}: ${lesson.title}` : null);
    return {
      totalLessons: lessons.length,
      lessonsWithVideo: lessons.filter((lesson) => lesson.hasVideo()).length,
      publishedNotes: notes.filter((note) => note.isPublished()).length,
      activeStudents: students.filter((student) => student.status === "active").length,
      lessonsWithQuiz: lessons.filter((lesson) => quizLessons.has(lesson.id)).length,
      pendingSubmissions: coding.filter((submission) => submission.completionStatus === "submitted").length,
      nextToRecord: label(lessons.find((lesson) => !lesson.hasVideo())),
      nextToWrite: label(lessons.find((lesson) => !lesson.hasNotes())),
    };
  }
}
