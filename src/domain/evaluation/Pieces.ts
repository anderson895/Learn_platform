/**
 * PIECES Evaluation (Objective 3 ng PDF): sinusukat ang level of acceptability ng system
 * gamit ang anim na criterion at 5-point Likert scale.
 */

export type CriterionKey = "performance" | "information" | "efficiency" | "control" | "economic" | "security";
export type RespondentType = "student" | "faculty";
export type Rating = 1 | 2 | 3 | 4 | 5;

export type QuestionItem = { id: string; text: string };
export type Criterion = { key: CriterionKey; name: string; description: string; items: QuestionItem[] };
export type Questionnaire = { isOpen: boolean; instructions: string; criteria: Criterion[] };

export const CRITERION_ORDER: CriterionKey[] = ["performance", "information", "efficiency", "control", "economic", "security"];

/** Likert scale (5 ang pinakamataas). */
export const LIKERT: { value: Rating; label: string; short: string }[] = [
  { value: 5, label: "Strongly Agree", short: "SA" },
  { value: 4, label: "Agree", short: "A" },
  { value: 3, label: "Neutral", short: "N" },
  { value: 2, label: "Disagree", short: "D" },
  { value: 1, label: "Strongly Disagree", short: "SD" },
];

/** Verbal interpretation ng weighted mean (level of acceptability). */
export class AcceptabilityScale {
  static readonly RANGES = [
    { min: 4.21, max: 5.0, label: "Highly Acceptable" },
    { min: 3.41, max: 4.2, label: "Very Acceptable" },
    { min: 2.61, max: 3.4, label: "Moderately Acceptable" },
    { min: 1.81, max: 2.6, label: "Slightly Acceptable" },
    { min: 1.0, max: 1.8, label: "Not Acceptable" },
  ] as const;

  /** Ina-round muna sa 2 decimal places, gaya ng nakasulat sa table ng thesis. */
  static interpret(mean: number | null): string {
    if (mean === null || Number.isNaN(mean)) return "No responses";
    const rounded = round2(mean);
    return AcceptabilityScale.RANGES.find((range) => rounded >= range.min)?.label ?? "Not Acceptable";
  }
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

export type ResponseData = {
  uid: string;
  respondentType: RespondentType;
  answers: Record<string, number>;
  comment: string;
  submittedAt: Date;
};

export type ItemResult = {
  id: string;
  text: string;
  /** Bilang ng sumagot ng 5, 4, 3, 2, 1. */
  distribution: Record<Rating, number>;
  n: number;
  mean: number | null;
  byGroup: Record<RespondentType, number | null>;
};
export type CriterionResult = { key: CriterionKey; name: string; mean: number | null; byGroup: Record<RespondentType, number | null>; items: ItemResult[] };
export type PiecesSummary = {
  respondents: { total: number; student: number; faculty: number };
  criteria: CriterionResult[];
  overall: number | null;
  overallByGroup: Record<RespondentType, number | null>;
};

const average = (values: (number | null)[]) => {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
};

/** Weighted mean ng isang tanong: Σ(f·x) / n. */
function itemMean(responses: ResponseData[], itemId: string): number | null {
  const ratings = responses.map((response) => response.answers[itemId]).filter((value) => value >= 1 && value <= 5);
  return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
}

export class PiecesEvaluation {
  constructor(public readonly questionnaire: Questionnaire) {}

  get itemIds(): string[] {
    return this.questionnaire.criteria.flatMap((criterion) => criterion.items.map((item) => item.id));
  }

  /** Dapat sagutan ang lahat ng tanong, 1 hanggang 5 lang. Ibinabalik ang mga ID ng kulang o mali. */
  missingAnswers(answers: Record<string, number>): string[] {
    return this.itemIds.filter((id) => !Number.isInteger(answers[id]) || answers[id] < 1 || answers[id] > 5);
  }

  /**
   * Summary ng resulta: weighted mean bawat tanong, average ng mga tanong bawat criterion,
   * at average ng mga criterion para sa overall. Hiwalay din para sa Students at Faculty.
   */
  summarize(responses: ResponseData[]): PiecesSummary {
    const groups: RespondentType[] = ["student", "faculty"];
    const byType = (type: RespondentType) => responses.filter((response) => response.respondentType === type);

    const criteria = this.questionnaire.criteria.map((criterion) => {
      const items = criterion.items.map((item) => {
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<Rating, number>;
        for (const response of responses) {
          const value = response.answers[item.id];
          if (value >= 1 && value <= 5) distribution[value as Rating] += 1;
        }
        const n = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        return {
          id: item.id,
          text: item.text,
          distribution,
          n,
          mean: itemMean(responses, item.id),
          byGroup: Object.fromEntries(groups.map((group) => [group, itemMean(byType(group), item.id)])) as Record<RespondentType, number | null>,
        };
      });
      return {
        key: criterion.key,
        name: criterion.name,
        items,
        mean: average(items.map((item) => item.mean)),
        byGroup: Object.fromEntries(groups.map((group) => [group, average(items.map((item) => item.byGroup[group]))])) as Record<RespondentType, number | null>,
      };
    });

    return {
      respondents: { total: responses.length, student: byType("student").length, faculty: byType("faculty").length },
      criteria,
      overall: average(criteria.map((criterion) => criterion.mean)),
      overallByGroup: Object.fromEntries(groups.map((group) => [group, average(criteria.map((criterion) => criterion.byGroup[group]))])) as Record<RespondentType, number | null>,
    };
  }
}

/** Karaniwang PIECES questionnaire para sa Learn Platform (puwedeng i-edit ng admin). */
export function defaultQuestionnaire(): Questionnaire {
  const criterion = (key: CriterionKey, name: string, description: string, items: string[]): Criterion => ({
    key,
    name,
    description,
    items: items.map((text, index) => ({ id: `${key.slice(0, 3)}${index + 1}`, text })),
  });
  return {
    isOpen: false,
    instructions:
      "Please rate each statement about the Interactive E-Learning System for Computer Programming 1 based on your experience. 5 = Strongly Agree, 4 = Agree, 3 = Neutral, 2 = Disagree, 1 = Strongly Disagree. Your answers are used only for this study.",
    criteria: [
      criterion("performance", "Performance", "Speed, responsiveness and reliability of the system.", [
        "The system loads lessons, videos and pages quickly.",
        "Logging in and moving between pages is fast and responsive.",
        "Activities and quizzes are checked and show results immediately.",
        "The system works without errors or crashes during use.",
        "The system stays fast even when many users are using it at the same time.",
      ]),
      criterion("information", "Information", "Accuracy, completeness and clarity of the information provided.", [
        "The lesson materials (videos, notes and code examples) are accurate and easy to understand.",
        "The lessons follow the Computer Programming 1 syllabus in the correct order.",
        "The progress board clearly shows which lessons are completed, in progress or locked.",
        "Quiz results and feedback clearly show my score and the correct answers.",
        "Records and reports provide complete and up-to-date information.",
      ]),
      criterion("efficiency", "Efficiency", "Ease of use and how well the system saves time and effort.", [
        "The system is easy to learn and use even without training.",
        "Lessons, activities and quizzes are organized in one place, saving time and effort.",
        "Tasks such as studying, answering, submitting and grading can be done in a few steps.",
        "The split-screen workspace lets me watch the lesson and practice at the same time.",
        "The system reduces the need for printed modules and separate tools.",
      ]),
      criterion("control", "Control", "Proper access, validation and management of the system.", [
        "Only registered users can access the system using their own account.",
        "Each user can only use the features allowed for their role (student, educator, chairman).",
        "The accomplishment threshold correctly keeps the next lesson locked until the passing score is reached.",
        "The system checks my inputs and shows clear messages when something is wrong.",
        "The educator can properly manage accounts, content and records.",
      ]),
      criterion("economic", "Economic", "Cost-effectiveness and value of the system.", [
        "The system can be used with a regular computer and web browser at no extra cost.",
        "The system reduces the cost of printing learning materials.",
        "The system uses free or low-cost services for hosting, database and media storage.",
        "The system saves time for both students and instructors.",
        "The benefits of the system are worth the effort of using and maintaining it.",
      ]),
      criterion("security", "Security", "Protection of accounts, data and assessments.", [
        "Passwords are protected and accounts are secured.",
        "Quiz answers cannot be seen by students before they submit.",
        "Personal information and records are kept safe and private.",
        "My session ends securely when I sign out, and deactivated accounts cannot log in.",
        "The system keeps a record of important activities and allows the data to be backed up.",
      ]),
    ],
  };
}
