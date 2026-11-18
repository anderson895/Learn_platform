import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeSequencingActivity } from "@/domain/assessment/CodeSequencingActivity";
import { CodingExercise } from "@/domain/assessment/CodingExercise";
import { MultipleChoiceQuestion, Quiz } from "@/domain/assessment/Quiz";
import type { Submission } from "@/repositories/ProgressRepositories";
import { makeLesson, makeUser } from "@/test/factories";
import { AssessmentService } from "./AssessmentService";

const START = new Date("2026-11-18T08:00:00.000Z");
const MINUTE = 60_000;

/** In-memory na kapalit ng mga Firestore repository, para walang tinatawag na totoong database. */
function setup() {
  const questions = [
    new MultipleChoiceQuestion("q1", "Which prints a line?", "", ['System.out.println("Hi");', 'print("Hi")']),
    new MultipleChoiceQuestion("q2", "Which declares an int?", "", ["x := 1", "int x = 1;"]),
  ];
  const quiz = new Quiz("quiz-1", "lesson-1", "Lesson Quiz", "quiz", 15, questions);
  const reviewer = new Quiz("rev-1", "lesson-1", "Syntax Reviewer", "reviewer", 0, questions);
  const activity = new CodeSequencingActivity("act-1", "lesson-1", "Variables", "Arrange.", [
    { id: "b3", code: "System.out.println(x);" },
    { id: "b1", code: "int x = 5;" },
    { id: "b2", code: "x = x + 1;" },
  ], 1);
  const exercise = new CodingExercise("ex-1", "lesson-1", "Print your name", "Use println.", "", 100);
  const lesson = makeLesson({ passingThreshold: 75 }, "lesson-1");
  const keys: Record<string, unknown> = {
    "quiz-1": { id: "quiz-1", refType: "quiz", answers: { q1: 0, q2: 1 } },
    "rev-1": { id: "rev-1", refType: "quiz", answers: { q1: 0, q2: 1 } },
    "act-1": { id: "act-1", refType: "activity", correctOrder: ["b1", "b2", "b3"] },
  };

  const store = new Map<string, Submission>();
  const submissions = {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findForStudentRef: vi.fn(async (studentId: string, refId: string) => [...store.values()].filter((s) => s.studentId === studentId && s.refId === refId)),
    create: vi.fn(async (submission: Submission) => {
      const id = `sub-${store.size + 1}`;
      store.set(id, { ...submission, id });
      return id;
    }),
    update: vi.fn(async (id: string, changes: Partial<Submission>) => {
      store.set(id, { ...store.get(id)!, ...changes });
    }),
  };
  const progress = {
    applyQuizResult: vi.fn(async (_studentId: string, _lesson: unknown, score: number) => ({ passed: score >= 75, best: score, newlyCompleted: score >= 75 })),
    recordActivity: vi.fn(async () => undefined),
    recordExerciseSubmission: vi.fn(async () => undefined),
    markReviewed: vi.fn(async () => undefined),
  };
  const logs = { create: vi.fn(async () => "log-1") };

  const service = new AssessmentService(
    { findById: async (id: string) => (id === "act-1" ? activity : null) } as never,
    { findById: async (id: string) => (id === "ex-1" ? exercise : null) } as never,
    { findById: async (id: string) => ({ "quiz-1": quiz, "rev-1": reviewer })[id] ?? null } as never,
    { findById: async (id: string) => keys[id] ?? null } as never,
    submissions as never,
    progress as never,
    { getLesson: async (id: string) => (id === "lesson-1" ? lesson : null) } as never,
    logs as never,
  );
  return { service, store, submissions, progress, logs, lesson };
}

const student = makeUser("student", {}, "student-1");
const otherStudent = makeUser("student", {}, "student-2");
const admin = makeUser("admin", {}, "admin-1");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
});
afterEach(() => vi.useRealTimers());

describe("Summative quiz: pagsisimula", () => {
  it("student: itinatala sa server ang oras ng pagsisimula at ang deadline", async () => {
    const { service, store } = setup();
    const { attemptId, deadline } = await service.startQuiz(student, "quiz-1");
    expect(attemptId).toBe("sub-1");
    expect(deadline).toBe(START.getTime() + 15 * MINUTE);
    expect(store.get("sub-1")).toMatchObject({ studentId: "student-1", refType: "quiz", completionStatus: "in_progress" });
  });

  it("ginagamit ulit ang bukas na attempt (hal. nag-refresh ng page) para hindi ma-reset ang timer", async () => {
    const { service, submissions } = setup();
    const first = await service.startQuiz(student, "quiz-1");
    vi.setSystemTime(new Date(START.getTime() + 5 * MINUTE));
    const second = await service.startQuiz(student, "quiz-1");
    expect(second).toEqual(first);
    expect(submissions.create).toHaveBeenCalledTimes(1);
  });

  it("admin preview: walang itinatalang attempt", async () => {
    const { service, submissions } = setup();
    const { attemptId } = await service.startQuiz(admin, "quiz-1");
    expect(attemptId).toBeNull();
    expect(submissions.create).not.toHaveBeenCalled();
  });

  it("hindi puwedeng simulan bilang quiz ang Syntax Reviewer", async () => {
    const { service } = setup();
    await expect(service.startQuiz(student, "rev-1")).rejects.toThrow("Quiz not found.");
  });
});

describe("Summative quiz: pag-submit at Accomplishment Threshold", () => {
  it("pasado: sine-save ang score at ina-apply sa progress (unlock)", async () => {
    const { service, store, progress, lesson } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    const outcome = await service.submitQuiz(student, "quiz-1", attemptId, { q1: 0, q2: 1 });

    expect(outcome).toMatchObject({ score: 100, passed: true, threshold: 75, newlyCompleted: true, preview: false });
    expect(store.get(attemptId!)).toMatchObject({ score: 100, passed: true, completionStatus: "completed" });
    expect(progress.applyQuizResult).toHaveBeenCalledWith("student-1", lesson, 100);
  });

  it("bagsak: mas mababa sa threshold ng lesson", async () => {
    const { service } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    const outcome = await service.submitQuiz(student, "quiz-1", attemptId, { q1: 0, q2: 0 });
    expect(outcome.score).toBe(50);
    expect(outcome.passed).toBe(false);
  });

  it("ipinapakita ang tamang sagot pagkatapos mag-submit (quiz feedback)", async () => {
    const { service } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    const outcome = await service.submitQuiz(student, "quiz-1", attemptId, { q1: 1, q2: null });
    expect(outcome.results).toEqual([
      { questionId: "q1", chosen: 1, correctIndex: 0, correct: false },
      { questionId: "q2", chosen: null, correctIndex: 1, correct: false },
    ]);
  });

  it("tanggap pa sa loob ng 60-segundong palugit pagkatapos ng time limit", async () => {
    const { service } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    vi.setSystemTime(new Date(START.getTime() + 15 * MINUTE + 30_000));
    expect((await service.submitQuiz(student, "quiz-1", attemptId, { q1: 0, q2: 1 })).score).toBe(100);
  });

  it("lampas sa time limit: 0 ang score, kahit tama ang mga sagot", async () => {
    const { service, store, progress, lesson } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    vi.setSystemTime(new Date(START.getTime() + 20 * MINUTE));
    const outcome = await service.submitQuiz(student, "quiz-1", attemptId, { q1: 0, q2: 1 });
    expect(outcome.score).toBe(0);
    expect(store.get(attemptId!)?.feedback).toBe("Submitted after the time limit.");
    expect(progress.applyQuizResult).toHaveBeenCalledWith("student-1", lesson, 0);
  });

  it("bawal i-submit ang attempt ng ibang student", async () => {
    const { service } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    await expect(service.submitQuiz(otherStudent, "quiz-1", attemptId, { q1: 0, q2: 1 })).rejects.toThrow("no longer active");
  });

  it("bawal i-submit nang dalawang beses ang iisang attempt", async () => {
    const { service, progress } = setup();
    const { attemptId } = await service.startQuiz(student, "quiz-1");
    await service.submitQuiz(student, "quiz-1", attemptId, { q1: 0, q2: 0 });
    await expect(service.submitQuiz(student, "quiz-1", attemptId, { q1: 0, q2: 1 })).rejects.toThrow("no longer active");
    expect(progress.applyQuizResult).toHaveBeenCalledTimes(1);
  });

  it("admin preview: may score pero walang sine-save at walang epekto sa progress", async () => {
    const { service, submissions, progress } = setup();
    const outcome = await service.submitQuiz(admin, "quiz-1", null, { q1: 0, q2: 1 });
    expect(outcome).toMatchObject({ score: 100, preview: true });
    expect(submissions.update).not.toHaveBeenCalled();
    expect(progress.applyQuizResult).not.toHaveBeenCalled();
  });
});

describe("Syntax Reviewer: Reveal Answer", () => {
  it("ibinibigay ang tamang sagot sa reviewer (formative)", async () => {
    const { service } = setup();
    expect(await service.revealReviewerAnswer("rev-1", "q2")).toBe(1);
  });

  it("hindi ibinibigay ang sagot ng summative quiz", async () => {
    const { service } = setup();
    await expect(service.revealReviewerAnswer("quiz-1", "q1")).rejects.toThrow("only be revealed in the Syntax Reviewer");
  });
});

describe("Code Sequencing", () => {
  it("tama: itinatala ang sagot at ang progress ng activity", async () => {
    const { service, store, progress } = setup();
    const result = await service.checkSequence(student, "act-1", ["b1", "b2", "b3"]);
    expect(result.correct).toBe(true);
    expect(progress.recordActivity).toHaveBeenCalledWith("student-1", "lesson-1", "act-1");
    expect([...store.values()][0]).toMatchObject({ refType: "activity", passed: true, score: 100 });
  });

  it("mali: may feedback pero hindi nadadagdag sa natapos na activities", async () => {
    const { service, progress } = setup();
    const result = await service.checkSequence(student, "act-1", ["b2", "b1", "b3"]);
    expect(result.correct).toBe(false);
    expect(progress.recordActivity).not.toHaveBeenCalled();
  });

  it("iisang record lang bawat student kahit ilang beses sumubok", async () => {
    const { service, store } = setup();
    await service.checkSequence(student, "act-1", ["b2", "b1", "b3"]);
    await service.checkSequence(student, "act-1", ["b1", "b2", "b3"]);
    expect(store.size).toBe(1);
    expect([...store.values()][0].passed).toBe(true);
  });

  it("admin preview: walang sine-save", async () => {
    const { service, store } = setup();
    await service.checkSequence(admin, "act-1", ["b1", "b2", "b3"]);
    expect(store.size).toBe(0);
  });
});

describe("Coding Exercise at pag-grade", () => {
  it("submission ng student: naghihintay ng grade, at napapalitan habang hindi pa na-grade", async () => {
    const { service, store, progress } = setup();
    await service.submitExercise(student, "ex-1", "System.out.println(1);");
    await service.submitExercise(student, "ex-1", 'System.out.println("Juan");');
    expect(store.size).toBe(1);
    expect([...store.values()][0]).toMatchObject({ completionStatus: "submitted", solutionCode: 'System.out.println("Juan");', score: null });
    expect(progress.recordExerciseSubmission).toHaveBeenCalledWith("student-1", "lesson-1", "ex-1");
  });

  it("admin preview: walang sine-save", async () => {
    const { service, store } = setup();
    const result = await service.submitExercise(admin, "ex-1", "code");
    expect(result.preview).toBe(true);
    expect(store.size).toBe(0);
  });

  it("grade: tinatanggihan ang score na lampas sa max", async () => {
    const { service } = setup();
    await service.submitExercise(student, "ex-1", "code");
    await expect(service.grade("sub-1", 101, "", "admin-1")).rejects.toThrow("Score must be from 0 to 100.");
  });

  it("grade: sine-save ang score, feedback at kung sino ang nag-grade", async () => {
    const { service, store, logs } = setup();
    await service.submitExercise(student, "ex-1", "code");
    await service.grade("sub-1", 90, "Good job!", "admin-1");
    expect(store.get("sub-1")).toMatchObject({ score: 90, feedback: "Good job!", completionStatus: "graded", gradedBy: "admin-1" });
    expect(logs.create).toHaveBeenCalled();
  });
});
