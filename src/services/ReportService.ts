import "server-only";
import { CodingExerciseRepository, QuizRepository } from "@/repositories/AssessmentRepositories";
import { ProgressRepository, SubmissionRepository } from "@/repositories/ProgressRepositories";
import { ContentService } from "./ContentService";
import { ProgressService } from "./ProgressService";
import { StudentAccountService } from "./StudentAccountService";

export type ReportType = "progress" | "assessments" | "performance";

export type ProgressReportRow = {
  studentNumber: string;
  name: string;
  course: string;
  yearLevel: string;
  completed: number;
  total: number;
  percent: number;
  averageQuizScore: number | null;
  status: string;
};

export type AssessmentReportRow = {
  lesson: string;
  quizTitle: string;
  items: number;
  threshold: number;
  attempts: number;
  studentsAttempted: number;
  averageScore: number | null;
  passRate: number | null;
  codingSubmitted: number;
  codingGraded: number;
  averageCodingPercent: number | null;
};

export type PerformanceReport = { lessons: { id: string; label: string; threshold: number }[]; rows: { name: string; studentNumber: string; scores: (number | null)[] }[] };

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

/** Report Management (Fig. 5): Student Progress, Assessment at Performance Reports. */
export class ReportService {
  constructor(
    private readonly content = new ContentService(),
    private readonly progress = new ProgressService(),
    private readonly students = new StudentAccountService(),
    private readonly quizzes = new QuizRepository(),
    private readonly exercises = new CodingExerciseRepository(),
    private readonly submissions = new SubmissionRepository(),
  ) {}

  async studentProgress(): Promise<ProgressReportRow[]> {
    const [roster, students] = await Promise.all([this.progress.roster(), this.students.list()]);
    const byId = new Map(students.map((student) => [student.uid, student]));
    return roster
      .map((row) => ({
        studentNumber: row.studentNumber,
        name: row.fullName,
        course: byId.get(row.uid)?.course ?? "",
        yearLevel: byId.get(row.uid)?.yearLevel ?? "",
        completed: row.completed,
        total: row.total,
        percent: row.percent,
        averageQuizScore: row.averageQuizScore,
        status: row.status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async assessments(): Promise<AssessmentReportRow[]> {
    const [lessons, quizzes, exercises, submissions] = await Promise.all([
      this.content.listLessons(),
      this.quizzes.findWhere("kind", "quiz"),
      this.exercises.findAll(),
      this.submissions.findAll(),
    ]);
    return lessons
      .map((lesson) => {
        const quiz = quizzes.find((item) => item.lessonId === lesson.id);
        const quizAttempts = quiz ? submissions.filter((s) => s.refId === quiz.id && s.completionStatus === "completed") : [];
        const bestByStudent = new Map<string, number>();
        for (const attempt of quizAttempts) bestByStudent.set(attempt.studentId, Math.max(bestByStudent.get(attempt.studentId) ?? 0, attempt.score ?? 0));
        const exerciseIds = new Set(exercises.filter((item) => item.lessonId === lesson.id).map((item) => item.id));
        const coding = submissions.filter((s) => exerciseIds.has(s.refId) && (s.completionStatus === "submitted" || s.completionStatus === "graded"));
        const graded = coding.filter((s) => s.completionStatus === "graded" && s.score !== null && s.maxScore > 0);
        const best = [...bestByStudent.values()];
        return {
          lesson: `${lesson.chapterLabel} · ${lesson.title}`,
          quizTitle: quiz?.title ?? "—",
          items: quiz?.totalItems ?? 0,
          threshold: lesson.passingThreshold,
          attempts: quizAttempts.length,
          studentsAttempted: bestByStudent.size,
          averageScore: average(quizAttempts.map((attempt) => attempt.score ?? 0)),
          passRate: best.length ? Math.round((best.filter((score) => score >= lesson.passingThreshold).length / best.length) * 100) : null,
          codingSubmitted: coding.length,
          codingGraded: graded.length,
          averageCodingPercent: average(graded.map((s) => ((s.score ?? 0) / s.maxScore) * 100)),
        };
      })
      .filter((row) => row.items > 0 || row.codingSubmitted > 0);
  }

  async performance(): Promise<PerformanceReport> {
    const [lessons, quizzes, students] = await Promise.all([
      this.content.listLessons({ publishedOnly: true }),
      this.quizzes.findWhere("kind", "quiz"),
      this.students.list(),
    ]);
    const quizLessons = lessons.filter((lesson) => quizzes.some((quiz) => quiz.lessonId === lesson.id && quiz.totalItems > 0));
    const rows = await Promise.all(
      students.map(async (student) => {
        const progress = await new ProgressRepository(student.uid).asMap();
        return { name: student.fullName, studentNumber: student.studentNumber, scores: quizLessons.map((lesson) => progress.get(lesson.id)?.bestQuizScore ?? null) };
      }),
    );
    return {
      lessons: quizLessons.map((lesson) => ({ id: lesson.id, label: lesson.chapterLabel, threshold: lesson.passingThreshold })),
      rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /** CSV na mabubuksan sa Excel (may BOM para tama ang mga letra). */
  async csv(type: ReportType): Promise<string> {
    let table: (string | number | null)[][];
    if (type === "progress") {
      const rows = await this.studentProgress();
      table = [
        ["Student No.", "Name", "Course", "Year Level", "Lessons Completed", "Total Lessons", "Progress %", "Avg. Quiz %", "Status"],
        ...rows.map((r) => [r.studentNumber, r.name, r.course, r.yearLevel, r.completed, r.total, r.percent, r.averageQuizScore, r.status]),
      ];
    } else if (type === "assessments") {
      const rows = await this.assessments();
      table = [
        ["Lesson", "Quiz", "Items", "Passing %", "Attempts", "Students", "Avg. Score %", "Pass Rate %", "Coding Submitted", "Coding Graded", "Avg. Coding %"],
        ...rows.map((r) => [r.lesson, r.quizTitle, r.items, r.threshold, r.attempts, r.studentsAttempted, r.averageScore, r.passRate, r.codingSubmitted, r.codingGraded, r.averageCodingPercent]),
      ];
    } else {
      const report = await this.performance();
      table = [["Student No.", "Name", ...report.lessons.map((lesson) => `${lesson.label} best %`)], ...report.rows.map((r) => [r.studentNumber, r.name, ...r.scores])];
    }
    const cell = (value: string | number | null) => {
      const text = value === null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return "﻿" + table.map((row) => row.map(cell).join(",")).join("\r\n");
  }
}
