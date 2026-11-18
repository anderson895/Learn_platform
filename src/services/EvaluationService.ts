import "server-only";
import {
  AcceptabilityScale,
  defaultQuestionnaire,
  LIKERT,
  PiecesEvaluation,
  round2,
  type PiecesSummary,
  type Questionnaire,
  type RespondentType,
} from "@/domain/evaluation/Pieces";
import type { User } from "@/domain/users/User";
import { AccountRepository } from "@/repositories/AccountRepository";
import { AuditLogRepository, type AuditLogEntry } from "@/repositories/AuditLogRepository";
import { PiecesResponseRepository, QuestionnaireRepository, type PiecesResponse } from "@/repositories/EvaluationRepositories";
import { StudentProfileRepository } from "@/repositories/StudentProfileRepository";

export type MyEvaluationDTO = { answers: Record<string, number>; comment: string; submittedAt: string; updatedAt: string } | null;
export type RespondentDTO = { uid: string; name: string; type: RespondentType; submittedAt: string; updatedAt: string; mean: number | null };
export type EvaluationResultsDTO = {
  summary: PiecesSummary;
  respondents: RespondentDTO[];
  comments: { type: RespondentType; text: string; submittedAt: string }[];
};
export type SubmitResult = { ok: true; updated: boolean } | { ok: false; message: string; missing?: string[] };
export type EvaluationCsv = "summary" | "responses";

const respondentTypeOf = (user: User): RespondentType => (user.role === "student" ? "student" : "faculty");
const fmt = (value: number | null) => (value === null ? "" : round2(value).toFixed(2));

function toCsv(table: (string | number | null)[][]): string {
  const cell = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + table.map((row) => row.map(cell).join(",")).join("\r\n");
}

/**
 * PIECES Evaluation (Objective 3): pagsagot ng students at faculty, pag-edit ng questionnaire,
 * at summary na may weighted mean at verbal interpretation.
 */
export class EvaluationService {
  constructor(
    private readonly questionnaires = new QuestionnaireRepository(),
    private readonly responses = new PiecesResponseRepository(),
    private readonly accounts = new AccountRepository(),
    private readonly profiles = new StudentProfileRepository(),
    private readonly logs = new AuditLogRepository(),
  ) {}

  getQuestionnaire(): Promise<Questionnaire> {
    return this.questionnaires.get();
  }

  async isOpen(): Promise<boolean> {
    return (await this.questionnaires.get()).isOpen;
  }

  async saveQuestionnaire(questionnaire: Questionnaire, actorUid: string): Promise<void> {
    await this.questionnaires.save(questionnaire);
    await this.log(actorUid, "update", "settings/pieces");
  }

  async setOpen(isOpen: boolean, actorUid: string): Promise<void> {
    const current = await this.questionnaires.get();
    await this.questionnaires.save({ ...current, isOpen });
    await this.log(actorUid, isOpen ? "publish" : "update", `settings/pieces (${isOpen ? "opened" : "closed"})`);
  }

  /** Ibinabalik ang default na mga tanong; hindi binabago kung bukas o sarado. */
  async resetQuestionnaire(actorUid: string): Promise<void> {
    const current = await this.questionnaires.get();
    await this.questionnaires.save({ ...defaultQuestionnaire(), isOpen: current.isOpen });
    await this.log(actorUid, "update", "settings/pieces (reset to default)");
  }

  async getMyResponse(uid: string): Promise<MyEvaluationDTO> {
    const response = await this.responses.findById(uid);
    if (!response) return null;
    return { answers: response.answers, comment: response.comment, submittedAt: response.submittedAt.toISOString(), updatedAt: response.updatedAt.toISOString() };
  }

  /** Sine-save ang sagot. Puwedeng baguhin habang bukas pa ang evaluation (papalitan ang dating sagot). */
  async submit(user: User, input: { answers: Record<string, number>; comment: string }): Promise<SubmitResult> {
    const questionnaire = await this.questionnaires.get();
    if (!questionnaire.isOpen) return { ok: false, message: "The evaluation is closed." };
    const evaluation = new PiecesEvaluation(questionnaire);
    const missing = evaluation.missingAnswers(input.answers);
    if (missing.length) return { ok: false, message: `Please answer all questions (${missing.length} left).`, missing };

    const answers = Object.fromEntries(evaluation.itemIds.map((id) => [id, input.answers[id]]));
    const previous = await this.responses.findById(user.id);
    const now = new Date();
    await this.responses.save({
      uid: user.id,
      role: user.role,
      respondentType: respondentTypeOf(user),
      answers,
      comment: input.comment.trim(),
      submittedAt: previous?.submittedAt ?? now,
      updatedAt: now,
    });
    await this.log(user.id, previous ? "update" : "create", "piecesResponses");
    return { ok: true, updated: Boolean(previous) };
  }

  async results(): Promise<EvaluationResultsDTO> {
    const [questionnaire, responses] = await Promise.all([this.questionnaires.get(), this.responses.findAll()]);
    const evaluation = new PiecesEvaluation(questionnaire);
    const names = await this.namesOf(responses);
    const sorted = [...responses].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return {
      summary: evaluation.summarize(responses),
      respondents: sorted.map((response) => ({
        uid: response.uid,
        name: names.get(response.uid) ?? "(deleted user)",
        type: response.respondentType,
        submittedAt: response.submittedAt.toISOString(),
        updatedAt: response.updatedAt.toISOString(),
        mean: evaluation.summarize([response]).overall,
      })),
      // Walang pangalan ang mga komento para manatiling confidential ang sumagot.
      comments: sorted.filter((response) => response.comment).map((response) => ({ type: response.respondentType, text: response.comment, submittedAt: response.updatedAt.toISOString() })),
    };
  }

  /**
   * CSV na mabubuksan sa Excel.
   * - `summary`: weighted mean at verbal interpretation bawat tanong at criterion (Students, Faculty, Overall).
   * - `responses`: raw na sagot bawat respondent (R1, R2...), walang pangalan, para sa sariling statistical treatment.
   */
  async csv(kind: EvaluationCsv): Promise<string> {
    const [questionnaire, responses] = await Promise.all([this.questionnaires.get(), this.responses.findAll()]);
    const evaluation = new PiecesEvaluation(questionnaire);
    if (kind === "responses") {
      const items = questionnaire.criteria.flatMap((criterion) => criterion.items.map((item, index) => ({ id: item.id, label: `${criterion.name} ${index + 1}` })));
      const ordered = [...responses].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
      return toCsv([
        ["Respondent", "Type", "Submitted", ...items.map((item) => item.label), "Comment"],
        ...ordered.map((response, index) => [
          `R${index + 1}`,
          response.respondentType === "student" ? "Student" : "Faculty",
          response.submittedAt.toISOString().slice(0, 10),
          ...items.map((item) => response.answers[item.id] ?? null),
          response.comment,
        ]),
      ]);
    }

    const summary = evaluation.summarize(responses);
    const groupHead = ["Students WM", "Faculty WM", "Overall WM", "Verbal Interpretation"];
    const rows: (string | number | null)[][] = [
      ["PIECES Evaluation Summary", `Respondents: ${summary.respondents.total} (Students ${summary.respondents.student}, Faculty ${summary.respondents.faculty})`],
      [],
      ["Criterion", "Statement", ...LIKERT.map((option) => `${option.short} (${option.value})`), "n", ...groupHead],
    ];
    for (const criterion of summary.criteria) {
      criterion.items.forEach((item, index) => {
        rows.push([
          criterion.name,
          `${index + 1}. ${item.text}`,
          ...LIKERT.map((option) => item.distribution[option.value]),
          item.n,
          fmt(item.byGroup.student),
          fmt(item.byGroup.faculty),
          fmt(item.mean),
          AcceptabilityScale.interpret(item.mean),
        ]);
      });
      rows.push([`${criterion.name} (average)`, "", "", "", "", "", "", "", fmt(criterion.byGroup.student), fmt(criterion.byGroup.faculty), fmt(criterion.mean), AcceptabilityScale.interpret(criterion.mean)]);
    }
    rows.push(["OVERALL", "", "", "", "", "", "", "", fmt(summary.overallByGroup.student), fmt(summary.overallByGroup.faculty), fmt(summary.overall), AcceptabilityScale.interpret(summary.overall)]);
    rows.push([], ["Scale", "Range", "Verbal Interpretation"], ...AcceptabilityScale.RANGES.map((range, index) => [5 - index, `${range.min.toFixed(2)} - ${range.max.toFixed(2)}`, range.label]));
    return toCsv(rows);
  }

  async clearResponses(actorUid: string): Promise<number> {
    const count = await this.responses.deleteAll();
    await this.log(actorUid, "delete", `piecesResponses (${count} responses)`);
    return count;
  }

  private async namesOf(responses: PiecesResponse[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    await Promise.all(
      responses.map(async (response) => {
        if (response.respondentType === "student") {
          const profile = await this.profiles.findById(response.uid);
          if (profile) return void names.set(response.uid, profile.fullName);
        }
        const account = await this.accounts.findById(response.uid);
        if (account) names.set(response.uid, account.displayName);
      }),
    );
    return names;
  }

  private async log(uid: string, action: AuditLogEntry["action"], target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
