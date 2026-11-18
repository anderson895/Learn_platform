import { Assessment, type EvaluationResult } from "./Assessment";

export type CodeBlock = { id: string; code: string };
export type SequencingKey = { correctOrder: string[] };
export type SequencingResult = EvaluationResult & { positions: boolean[] };

/** Code Sequencing (Fig. 13): ayusin ang mga code block para mabuo ang tamang Java program. Formative. */
export class CodeSequencingActivity extends Assessment<string[], SequencingKey, SequencingResult> {
  constructor(
    id: string,
    lessonId: string,
    title: string,
    public readonly instructions: string,
    /** Nakahalo na ang pagkakasunod (shuffled) para sa student. */
    public readonly blocks: CodeBlock[],
    public readonly order: number,
  ) {
    super(id, lessonId, title);
  }

  get type() {
    return "code_sequencing" as const;
  }
  get isSummative() {
    return false;
  }

  evaluate(answer: string[], key: SequencingKey): SequencingResult {
    // Kinukumpara ang code, hindi ang ID: kapag may magkaparehong linya (hal. dalawang "}"),
    // tama pa rin kahit alin sa dalawa ang mauna.
    const codeOf = new Map(this.blocks.map((block) => [block.id, block.code]));
    const positions = key.correctOrder.map((blockId, index) => answer[index] !== undefined && codeOf.get(answer[index]) === codeOf.get(blockId));
    const correctCount = positions.filter(Boolean).length;
    const total = key.correctOrder.length;
    const correct = answer.length === total && correctCount === total;
    return {
      correct,
      positions,
      score: total ? Math.round((correctCount / total) * 100) : 0,
      feedback: correct
        ? "Correct! The program is in the right order."
        : answer.length < total
          ? `Use all ${total} blocks. ${correctCount} are in the right place so far.`
          : `${correctCount} of ${total} blocks are in the right place. Try again.`,
    };
  }

  /** Gumagawa ng mga block mula sa tamang code (isang linya bawat block) at hinahalo ang pagkakasunod. */
  static fromSolution(solution: string, makeId: () => string): { blocks: CodeBlock[]; key: SequencingKey } {
    const ordered = solution
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((code) => ({ id: makeId(), code }));
    const shuffled = [...ordered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Siguraduhing hindi pareho sa tamang order ang nakahalo.
    if (shuffled.length > 1 && shuffled.every((block, index) => block.id === ordered[index].id)) shuffled.reverse();
    return { blocks: shuffled, key: { correctOrder: ordered.map((block) => block.id) } };
  }
}
