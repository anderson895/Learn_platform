import { describe, expect, it, vi } from "vitest";
import { CodeSequencingActivity } from "./CodeSequencingActivity";
import { CodingExercise } from "./CodingExercise";
import { MultipleChoiceQuestion, Quiz } from "./Quiz";

const SOLUTION = "int x = 5;\nx = x + 1;\nSystem.out.println(x);";

function sequencing() {
  let next = 0;
  const { blocks, key } = CodeSequencingActivity.fromSolution(SOLUTION, () => `b${++next}`);
  return { activity: new CodeSequencingActivity("act-1", "lesson-1", "Variables", "Arrange the blocks.", blocks, 1), key, blocks };
}

describe("CodeSequencingActivity", () => {
  it("formative ito, hindi summative", () => {
    const { activity } = sequencing();
    expect(activity.type).toBe("code_sequencing");
    expect(activity.isSummative).toBe(false);
  });

  it("fromSolution: isang block bawat linya, tinatanggal ang blangkong linya at espasyo", () => {
    const { blocks, key } = CodeSequencingActivity.fromSolution("  int a = 1;  \n\n   \nSystem.out.println(a);\n", () => Math.random().toString(36));
    expect(blocks).toHaveLength(2);
    const byId = new Map(blocks.map((block) => [block.id, block.code]));
    expect(key.correctOrder.map((id) => byId.get(id))).toEqual(["int a = 1;", "System.out.println(a);"]);
  });

  it("fromSolution: laging nakahalo ang ipinapakitang pagkakasunod", () => {
    // Kahit "hindi gumalaw" ang shuffle (random = 0.999...), hindi dapat lumabas ang tamang order.
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    const { blocks, key } = sequencing();
    expect(blocks.map((block) => block.id)).not.toEqual(key.correctOrder);
  });

  it("evaluate: tama ang buong pagkakasunod", () => {
    const { activity, key } = sequencing();
    const result = activity.evaluate(key.correctOrder, key);
    expect(result.correct).toBe(true);
    expect(result.score).toBe(100);
    expect(result.positions).toEqual([true, true, true]);
  });

  it("evaluate: ipinapakita kung aling posisyon ang tama", () => {
    const { activity, key } = sequencing();
    const [first, second, third] = key.correctOrder;
    const result = activity.evaluate([first, third, second], key);
    expect(result.correct).toBe(false);
    expect(result.positions).toEqual([true, false, false]);
    expect(result.score).toBe(33);
    expect(result.feedback).toContain("1 of 3");
  });

  it("evaluate: tama pa rin kahit pinagpalit ang dalawang magkaparehong linya (hal. dalawang '}')", () => {
    let next = 0;
    const { blocks, key } = CodeSequencingActivity.fromSolution("public class Main {\nvoid run() {\n}\n}", () => `d${++next}`);
    const activity = new CodeSequencingActivity("act-2", "lesson-1", "Braces", "", blocks, 2);
    const [first, second, brace1, brace2] = key.correctOrder;
    expect(activity.evaluate([first, second, brace2, brace1], key).correct).toBe(true);
    expect(activity.evaluate([second, first, brace1, brace2], key).correct).toBe(false);
  });

  it("evaluate: kulang ang mga block na ginamit", () => {
    const { activity, key } = sequencing();
    const result = activity.evaluate([key.correctOrder[0]], key);
    expect(result.correct).toBe(false);
    expect(result.feedback).toContain("Use all 3 blocks");
  });
});

describe("Quiz (Syntax Reviewer at Summative Quiz)", () => {
  const questions = [
    new MultipleChoiceQuestion("q1", "Which prints a line?", "", ['System.out.println("Hi");', 'print("Hi")', 'echo "Hi"']),
    new MultipleChoiceQuestion("q2", "Which declares an int?", "", ["int x = 1;", "x := 1"]),
    new MultipleChoiceQuestion("q3", "Which is a loop?", "", ["for", "if"]),
  ];
  const key = { answers: { q1: 0, q2: 0, q3: 0 } };

  it("summative lang ang 'quiz'; formative ang 'reviewer'", () => {
    expect(new Quiz("z1", "l1", "Quiz", "quiz", 15, questions).isSummative).toBe(true);
    expect(new Quiz("z2", "l1", "Reviewer", "reviewer", 0, questions).isSummative).toBe(false);
    expect(new Quiz("z1", "l1", "Quiz", "quiz", 15, questions).totalItems).toBe(3);
  });

  it("evaluate: porsyento ng tamang sagot (naka-round)", () => {
    const quiz = new Quiz("z1", "l1", "Quiz", "quiz", 15, questions);
    const result = quiz.evaluate({ q1: 0, q2: 1, q3: 0 }, key);
    expect(result.correctCount).toBe(2);
    expect(result.total).toBe(3);
    expect(result.score).toBe(67);
    expect(result.correct).toBe(false);
    expect(result.results.find((item) => item.questionId === "q2")).toMatchObject({ chosen: 1, correctIndex: 0, correct: false });
  });

  it("evaluate: mali ang walang sagot", () => {
    const quiz = new Quiz("z1", "l1", "Quiz", "quiz", 15, questions);
    const result = quiz.evaluate({ q1: 0, q2: null }, key);
    expect(result.correctCount).toBe(1);
    expect(result.results.find((item) => item.questionId === "q3")?.chosen).toBeNull();
  });

  it("evaluate: perpektong score", () => {
    const result = new Quiz("z1", "l1", "Quiz", "quiz", 15, questions).evaluate({ q1: 0, q2: 0, q3: 0 }, key);
    expect(result.score).toBe(100);
    expect(result.correct).toBe(true);
  });

  it("evaluate: walang tanong ay 0, hindi NaN", () => {
    const result = new Quiz("z1", "l1", "Quiz", "quiz", 15, []).evaluate({}, { answers: {} });
    expect(result.score).toBe(0);
    expect(result.correct).toBe(false);
  });

  it("MultipleChoiceQuestion.isCorrect", () => {
    expect(questions[0].isCorrect(0, 0)).toBe(true);
    expect(questions[0].isCorrect(1, 0)).toBe(false);
    expect(questions[0].isCorrect(null, 0)).toBe(false);
  });
});

describe("CodingExercise", () => {
  it("walang automatic grading: ang instructor ang magbibigay ng score", () => {
    const exercise = new CodingExercise("ex1", "l1", "Print your name", "Use System.out.println.", "", 100);
    const result = exercise.evaluate();
    expect(result.score).toBeNull();
    expect(result.correct).toBeNull();
    expect(exercise.programmingLanguage).toBe("Java");
    expect(exercise.isSummative).toBe(false);
  });
});
