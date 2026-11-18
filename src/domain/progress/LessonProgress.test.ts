import { describe, expect, it } from "vitest";
import { makeProgress } from "@/test/factories";
import { emptyProgress, ProgressPolicy, type BoardLesson, type LessonProgressProps } from "./LessonProgress";

const lessons: BoardLesson[] = [
  { lessonId: "L1", order: 1, threshold: 75 },
  { lessonId: "L2", order: 2, threshold: 75 },
  { lessonId: "L3", order: 3, threshold: 80 },
];

const statuses = (entries: LessonProgressProps[], list = lessons) => Object.fromEntries(ProgressPolicy.statuses(list, new Map(entries.map((entry) => [entry.lessonId, entry]))));

describe("ProgressPolicy.meetsThreshold (Accomplishment Threshold)", () => {
  it("pasado kapag kapantay o mas mataas sa threshold", () => {
    expect(ProgressPolicy.meetsThreshold(75, 75)).toBe(true);
    expect(ProgressPolicy.meetsThreshold(100, 75)).toBe(true);
    expect(ProgressPolicy.meetsThreshold(74, 75)).toBe(false);
  });

  it("hindi pasado kapag wala pang score", () => {
    expect(ProgressPolicy.meetsThreshold(null, 0)).toBe(false);
  });
});

describe("ProgressPolicy.statuses (pag-unlock at color-coded status)", () => {
  it("bagong student: bukas ang unang lesson, naka-lock ang iba", () => {
    expect(statuses([])).toEqual({ L1: "not_started", L2: "locked", L3: "locked" });
  });

  it("in progress kapag nabuksan na pero wala pang quiz attempt", () => {
    expect(statuses([makeProgress("L1")])).toEqual({ L1: "in_progress", L2: "locked", L3: "locked" });
  });

  it("below threshold kapag may attempt pero bagsak; naka-lock pa rin ang susunod", () => {
    const entry = makeProgress("L1", { quizAttempts: 1, bestQuizScore: 50 });
    expect(statuses([entry])).toEqual({ L1: "below_threshold", L2: "locked", L3: "locked" });
  });

  it("completed ang lesson ay nagbubukas ng kasunod lang", () => {
    const done = makeProgress("L1", { status: "completed", quizAttempts: 2, bestQuizScore: 90 });
    expect(statuses([done])).toEqual({ L1: "completed", L2: "not_started", L3: "locked" });
  });

  it("buong kurso tapos", () => {
    const all = lessons.map((lesson) => makeProgress(lesson.lessonId, { status: "completed" }));
    expect(Object.values(statuses(all))).toEqual(["completed", "completed", "completed"]);
  });

  it("hindi malalaktawan ang naka-lock na lesson kahit may lumang progress ito", () => {
    // Hal. binago ng admin ang pagkakasunod pagkatapos makapag-progress ang student.
    const skipped = makeProgress("L3", { status: "completed" });
    expect(statuses([skipped]).L3).toBe("locked");
  });

  it("sumusunod sa order ng lesson, hindi sa pagkakasunod ng listahan", () => {
    const shuffled = [lessons[2], lessons[0], lessons[1]];
    const done = makeProgress("L1", { status: "completed" });
    expect(statuses([done], shuffled)).toEqual({ L1: "completed", L2: "not_started", L3: "locked" });
  });
});

describe("emptyProgress", () => {
  it("panimulang progress ng lesson", () => {
    expect(emptyProgress("L1")).toMatchObject({
      lessonId: "L1",
      status: "in_progress",
      bestQuizScore: null,
      quizAttempts: 0,
      activitiesDone: [],
      exercisesSubmitted: [],
      reviewed: false,
      completedAt: null,
    });
  });
});
