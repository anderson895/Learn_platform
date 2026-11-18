import { describe, expect, it } from "vitest";
import { AcceptabilityScale, defaultQuestionnaire, PiecesEvaluation, type ResponseData } from "./Pieces";

const evaluation = new PiecesEvaluation(defaultQuestionnaire());
const allAnswers = (value: number) => Object.fromEntries(evaluation.itemIds.map((id) => [id, value]));
const response = (respondentType: "student" | "faculty", answers: Record<string, number>, uid = Math.random().toString(36)): ResponseData => ({
  uid,
  respondentType,
  answers,
  comment: "",
  submittedAt: new Date(),
});

describe("defaultQuestionnaire", () => {
  it("anim na PIECES criterion ayon sa PDF, tig-5 tanong, at walang dobleng ID", () => {
    const questionnaire = defaultQuestionnaire();
    expect(questionnaire.criteria.map((criterion) => criterion.name)).toEqual(["Performance", "Information", "Efficiency", "Control", "Economic", "Security"]);
    expect(questionnaire.criteria.every((criterion) => criterion.items.length === 5)).toBe(true);
    expect(new Set(evaluation.itemIds).size).toBe(30);
    expect(questionnaire.isOpen).toBe(false);
  });
});

describe("AcceptabilityScale.interpret", () => {
  it.each([
    [5, "Highly Acceptable"],
    [4.21, "Highly Acceptable"],
    [4.2, "Very Acceptable"],
    [3.41, "Very Acceptable"],
    [3.4, "Moderately Acceptable"],
    [2.61, "Moderately Acceptable"],
    [2.6, "Slightly Acceptable"],
    [1.81, "Slightly Acceptable"],
    [1.8, "Not Acceptable"],
    [1, "Not Acceptable"],
  ])("%s → %s", (mean, label) => {
    expect(AcceptabilityScale.interpret(mean)).toBe(label);
  });

  it("ina-round sa 2 decimal places bago i-interpret (hal. 4.205 → 4.21)", () => {
    expect(AcceptabilityScale.interpret(4.205)).toBe("Highly Acceptable");
    expect(AcceptabilityScale.interpret(4.2049)).toBe("Very Acceptable");
  });

  it("walang sagot", () => {
    expect(AcceptabilityScale.interpret(null)).toBe("No responses");
  });
});

describe("PiecesEvaluation.missingAnswers", () => {
  it("kailangang sagutan lahat ng 30 tanong, 1 hanggang 5 lang", () => {
    expect(evaluation.missingAnswers(allAnswers(4))).toEqual([]);
    const partial = allAnswers(4);
    delete partial.per1;
    partial.sec5 = 6;
    partial.inf2 = 2.5;
    expect(evaluation.missingAnswers(partial).sort()).toEqual(["inf2", "per1", "sec5"]);
  });
});

describe("PiecesEvaluation.summarize", () => {
  it("weighted mean bawat tanong, criterion at overall", () => {
    const answersA = allAnswers(5);
    const answersB = allAnswers(4);
    answersB.per1 = 2;
    const summary = evaluation.summarize([response("student", answersA), response("student", answersB)]);
    const performance = summary.criteria.find((criterion) => criterion.key === "performance")!;
    const per1 = performance.items.find((item) => item.id === "per1")!;
    expect(per1.mean).toBe(3.5); // (5 + 2) / 2
    expect(per1.distribution).toEqual({ 5: 1, 4: 0, 3: 0, 2: 1, 1: 0 });
    expect(per1.n).toBe(2);
    expect(performance.mean).toBeCloseTo((3.5 + 4.5 * 4) / 5); // 4.3
    expect(summary.criteria.find((criterion) => criterion.key === "security")!.mean).toBe(4.5);
    expect(summary.respondents).toEqual({ total: 2, student: 2, faculty: 0 });
  });

  it("hiwalay ang resulta ng Students at Faculty", () => {
    const summary = evaluation.summarize([response("student", allAnswers(5)), response("faculty", allAnswers(3)), response("faculty", allAnswers(4))]);
    expect(summary.overallByGroup.student).toBe(5);
    expect(summary.overallByGroup.faculty).toBe(3.5);
    expect(summary.overall).toBeCloseTo(4); // (5 + 3 + 4) / 3
    expect(summary.respondents).toEqual({ total: 3, student: 1, faculty: 2 });
  });

  it("walang sagot: null ang mga mean, hindi NaN", () => {
    const summary = evaluation.summarize([]);
    expect(summary.overall).toBeNull();
    expect(summary.criteria[0].mean).toBeNull();
    expect(summary.criteria[0].items[0].byGroup.student).toBeNull();
  });

  it("binabalewala ang sagot sa tanong na binura na sa questionnaire", () => {
    const answers = { ...allAnswers(4), removedItem: 1 };
    expect(evaluation.summarize([response("student", answers)]).overall).toBe(4);
  });
});
