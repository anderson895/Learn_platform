import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lesson } from "@/domain/content/Lesson";
import { makeLesson, makeUser } from "@/test/factories";
import { ProgressService } from "./ProgressService";

/**
 * Maliit na in-memory na Firestore: sapat para sa collection/doc paths, transactions, get, set, update at listahan.
 * Pinapalitan nito ang `getAdminDb()`, kaya walang tinatawag na totoong Firebase.
 */
const fake = vi.hoisted(() => {
  const docs = new Map<string, Record<string, unknown>>();
  const snap = (path: string) => ({ exists: docs.has(path), id: path.split("/").pop()!, data: () => docs.get(path) });
  type DocRef = { path: string; id: string; collection: (name: string) => ColRef; get: () => Promise<ReturnType<typeof snap>>; set: (data: Record<string, unknown>) => Promise<void>; update: (data: Record<string, unknown>) => Promise<void> };
  type ColRef = { doc: (id: string) => DocRef; get: () => Promise<{ docs: ReturnType<typeof snap>[] }> };
  const doc = (path: string): DocRef => ({
    path,
    id: path.split("/").pop()!,
    collection: (name) => col(`${path}/${name}`),
    get: async () => snap(path),
    set: async (data) => void docs.set(path, data),
    update: async (data) => void docs.set(path, { ...docs.get(path), ...data }),
  });
  const col = (path: string): ColRef => ({
    doc: (id) => doc(`${path}/${id}`),
    get: async () => ({ docs: [...docs.keys()].filter((key) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/")).map(snap) }),
  });
  const db = {
    collection: (name: string) => col(name),
    runTransaction: async <T,>(fn: (tx: { get: (ref: DocRef) => Promise<ReturnType<typeof snap>>; set: (ref: DocRef, data: Record<string, unknown>) => void }) => Promise<T>) =>
      fn({ get: async (ref) => snap(ref.path), set: (ref, data) => void docs.set(ref.path, data) }),
  };
  return { docs, db };
});

vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => fake.db }));

const L1 = makeLesson({ order: 1, passingThreshold: 75 }, "L1");
const L2 = makeLesson({ order: 2, passingThreshold: 75 }, "L2");
const L3 = makeLesson({ order: 3, passingThreshold: 80 }, "L3");

function service(lessons: Lesson[] = [L1, L2, L3], quizLessonIds: string[] = ["L1", "L2", "L3"]) {
  const content = { listLessons: vi.fn(async () => lessons) };
  const quizzes = { findWhere: vi.fn(async () => quizLessonIds.map((lessonId) => ({ lessonId, totalItems: 5 }))) };
  return new ProgressService(content as never, quizzes as never);
}

const stored = (studentId: string, lessonId: string) => fake.docs.get(`progress/${studentId}/lessons/${lessonId}`);

beforeEach(() => fake.docs.clear());

describe("applyQuizResult (Accomplishment Threshold)", () => {
  it("pasado sa unang attempt: completed at nabubuksan ang susunod", async () => {
    const result = await service().applyQuizResult("s1", L1, 80);
    expect(result).toEqual({ passed: true, best: 80, newlyCompleted: true });
    expect(stored("s1", "L1")).toMatchObject({ status: "completed", bestQuizScore: 80, quizAttempts: 1 });
    expect(stored("s1", "L1")?.completedAt).toBeTruthy();
  });

  it("bagsak muna, saka pasado", async () => {
    const progress = service();
    expect(await progress.applyQuizResult("s1", L1, 50)).toEqual({ passed: false, best: 50, newlyCompleted: false });
    expect(stored("s1", "L1")).toMatchObject({ status: "in_progress", quizAttempts: 1, completedAt: null });

    expect(await progress.applyQuizResult("s1", L1, 90)).toEqual({ passed: true, best: 90, newlyCompleted: true });
    expect(stored("s1", "L1")).toMatchObject({ status: "completed", bestQuizScore: 90, quizAttempts: 2 });
  });

  it("itinatabi ang pinakamataas na score, at hindi na bumabalik sa 'in progress' ang tapos na", async () => {
    const progress = service();
    await progress.applyQuizResult("s1", L1, 90);
    const completedAt = stored("s1", "L1")?.completedAt;

    const retake = await progress.applyQuizResult("s1", L1, 40);
    expect(retake).toEqual({ passed: false, best: 90, newlyCompleted: false });
    expect(stored("s1", "L1")).toMatchObject({ status: "completed", bestQuizScore: 90, quizAttempts: 2 });
    expect(stored("s1", "L1")?.completedAt).toEqual(completedAt);
  });

  it("sinusunod ang sariling threshold ng bawat lesson", async () => {
    expect((await service().applyQuizResult("s1", L3, 78)).passed).toBe(false); // kailangan ng 80
  });

  it("hiwalay ang progress ng bawat student", async () => {
    const progress = service();
    await progress.applyQuizResult("s1", L1, 100);
    expect(stored("s2", "L1")).toBeUndefined();
  });
});

describe("markDone (lesson na walang quiz)", () => {
  it("nako-complete ang lesson na walang summative quiz", async () => {
    expect(await service([L1], []).markDone("s1", L1)).toBe(true);
    expect(stored("s1", "L1")).toMatchObject({ status: "completed" });
  });

  it("hindi puwedeng laktawan ang quiz sa pamamagitan ng 'Mark as done'", async () => {
    expect(await service([L1], ["L1"]).markDone("s1", L1)).toBe(false);
    expect(stored("s1", "L1")?.status).not.toBe("completed");
  });
});

describe("board (Syllabus Progress Board, Fig. 15)", () => {
  it("bagong student: bukas ang una, naka-lock ang iba", async () => {
    const board = await service().board("s1");
    expect(board.rows.map((row) => row.status)).toEqual(["not_started", "locked", "locked"]);
    expect(board).toMatchObject({ total: 3, completed: 0, percent: 0 });
  });

  it("pagkatapos pumasa sa L1: completed ang L1, bukas ang L2", async () => {
    const progress = service();
    await progress.applyQuizResult("s1", L1, 100);
    const board = await progress.board("s1");
    expect(board.rows.map((row) => row.status)).toEqual(["completed", "not_started", "locked"]);
    expect(board).toMatchObject({ completed: 1, percent: 33 });
    expect(board.rows[0]).toMatchObject({ bestQuizScore: 100, hasQuiz: true, mediaCode: "VID-001", quizCode: "QZ-001" });
  });

  it("canOpen: hinaharangan ang student sa naka-lock na lesson, pero hindi ang admin", async () => {
    const progress = service();
    expect(await progress.canOpen(makeUser("student", {}, "s1"), L2)).toEqual({ allowed: false, status: "locked" });
    expect((await progress.canOpen(makeUser("admin"), L2)).allowed).toBe(true);
  });

  it("canOpen: hindi mabubuksan ng student ang draft na lesson", async () => {
    const draft = makeLesson({ order: 1, status: "draft" }, "L1");
    expect((await service([draft]).canOpen(makeUser("student", {}, "s1"), draft)).allowed).toBe(false);
  });
});
