import { describe, expect, it, vi } from "vitest";
import { defaultQuestionnaire, type Questionnaire } from "@/domain/evaluation/Pieces";
import type { PiecesResponse } from "@/repositories/EvaluationRepositories";
import { FIXED_DATE, makeUser } from "@/test/factories";
import { EvaluationService } from "./EvaluationService";

const student = makeUser("student", {}, "student-1");
const admin = makeUser("admin", { displayName: "Prof. Pedro Santos" }, "admin-1");
const chairman = makeUser("chairman", { displayName: "Dr. Maria Cruz" }, "chair-1");

function setup({ isOpen = true } = {}) {
  let questionnaire: Questionnaire = { ...defaultQuestionnaire(), isOpen };
  const stored = new Map<string, PiecesResponse>();
  const questionnaires = {
    get: vi.fn(async () => questionnaire),
    save: vi.fn(async (next: Questionnaire) => void (questionnaire = next)),
  };
  const responses = {
    findById: vi.fn(async (uid: string) => stored.get(uid) ?? null),
    findAll: vi.fn(async () => [...stored.values()]),
    save: vi.fn(async (response: PiecesResponse) => void stored.set(response.uid, response)),
    deleteAll: vi.fn(async () => {
      const count = stored.size;
      stored.clear();
      return count;
    }),
  };
  const users = new Map([student, admin, chairman].map((user) => [user.id, user]));
  const accounts = { findById: vi.fn(async (id: string) => users.get(id) ?? null) };
  const profiles = { findById: vi.fn(async (id: string) => (id === student.id ? { fullName: "Juan Dela Cruz" } : null)) };
  const logs = { create: vi.fn(async () => "log-1") };
  const service = new EvaluationService(questionnaires as never, responses as never, accounts as never, profiles as never, logs as never);
  const ids = defaultQuestionnaire().criteria.flatMap((criterion) => criterion.items.map((item) => item.id));
  const all = (value: number) => Object.fromEntries(ids.map((id) => [id, value]));
  return { service, stored, questionnaires, responses, logs, all, getQuestionnaire: () => questionnaire };
}

describe("EvaluationService.submit", () => {
  it("sarado ang evaluation: hindi tinatanggap ang sagot", async () => {
    const { service, all, responses } = setup({ isOpen: false });
    expect(await service.submit(student, { answers: all(5), comment: "" })).toEqual({ ok: false, message: "The evaluation is closed." });
    expect(responses.save).not.toHaveBeenCalled();
  });

  it("may kulang na sagot: ibinabalik kung alin", async () => {
    const { service, all, responses } = setup();
    const answers = all(4);
    delete answers.eco3;
    const result = await service.submit(student, { answers, comment: "" });
    expect(result).toEqual({ ok: false, message: "Please answer all questions (1 left).", missing: ["eco3"] });
    expect(responses.save).not.toHaveBeenCalled();
  });

  it("student → Student; admin at chairman → Faculty", async () => {
    const { service, all, stored } = setup();
    await service.submit(student, { answers: all(5), comment: "  Maganda!  " });
    await service.submit(admin, { answers: all(4), comment: "" });
    await service.submit(chairman, { answers: all(3), comment: "" });
    expect(stored.get(student.id)).toMatchObject({ respondentType: "student", role: "student", comment: "Maganda!" });
    expect(stored.get(admin.id)?.respondentType).toBe("faculty");
    expect(stored.get(chairman.id)?.respondentType).toBe("faculty");
  });

  it("puwedeng baguhin ang sagot: pinapalitan, at nananatili ang unang submittedAt", async () => {
    const { service, all, stored } = setup();
    expect(await service.submit(student, { answers: all(2), comment: "" })).toEqual({ ok: true, updated: false });
    stored.set(student.id, { ...stored.get(student.id)!, submittedAt: FIXED_DATE });
    expect(await service.submit(student, { answers: all(5), comment: "" })).toEqual({ ok: true, updated: true });
    expect(stored.size).toBe(1);
    expect(stored.get(student.id)!.answers.per1).toBe(5);
    expect(stored.get(student.id)!.submittedAt).toEqual(FIXED_DATE);
  });

  it("hindi sine-save ang sagot sa tanong na wala sa questionnaire", async () => {
    const { service, all, stored } = setup();
    await service.submit(student, { answers: { ...all(4), hacked: 1 }, comment: "" });
    expect(stored.get(student.id)!.answers).not.toHaveProperty("hacked");
  });
});

describe("EvaluationService questionnaire", () => {
  it("setOpen: binubuksan/sinasara nang hindi binabago ang mga tanong", async () => {
    const { service, getQuestionnaire } = setup({ isOpen: false });
    await service.saveQuestionnaire({ ...getQuestionnaire(), instructions: "Bagong instructions" }, admin.id);
    await service.setOpen(true, admin.id);
    expect(getQuestionnaire()).toMatchObject({ isOpen: true, instructions: "Bagong instructions" });
  });

  it("resetQuestionnaire: ibinabalik ang default pero nananatiling bukas", async () => {
    const { service, getQuestionnaire } = setup({ isOpen: true });
    await service.saveQuestionnaire({ ...getQuestionnaire(), instructions: "Iba" }, admin.id);
    await service.resetQuestionnaire(admin.id);
    expect(getQuestionnaire()).toEqual({ ...defaultQuestionnaire(), isOpen: true });
  });
});

describe("EvaluationService.results at csv", () => {
  it("results: pangalan ng respondent, mean bawat isa, at komentong walang pangalan", async () => {
    const { service, all } = setup();
    await service.submit(student, { answers: all(5), comment: "Sana may dark mode." });
    await service.submit(admin, { answers: all(4), comment: "" });
    const results = await service.results();
    expect(results.summary.overall).toBe(4.5);
    expect(results.summary.overallByGroup).toEqual({ student: 5, faculty: 4 });
    expect(results.respondents.map((r) => [r.name, r.type, r.mean]).sort()).toEqual([
      ["Juan Dela Cruz", "student", 5],
      ["Prof. Pedro Santos", "faculty", 4],
    ]);
    expect(results.comments).toEqual([{ type: "student", text: "Sana may dark mode.", submittedAt: expect.any(String) }]);
  });

  it("summary CSV: weighted mean na 2 decimal places at verbal interpretation", async () => {
    const { service, all } = setup();
    await service.submit(student, { answers: all(5), comment: "" });
    await service.submit(admin, { answers: all(4), comment: "" });
    const csv = await service.csv("summary");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("OVERALL,,,,,,,,5.00,4.00,4.50,Highly Acceptable");
    expect(csv).toContain("Performance (average),,,,,,,,5.00,4.00,4.50,Highly Acceptable");
    expect(csv).toContain("4.21 - 5.00,Highly Acceptable");
  });

  it("responses CSV: R1, R2… at walang pangalan o email", async () => {
    const { service, all } = setup();
    await service.submit(student, { answers: all(5), comment: 'Sabi niya "ok", sige' });
    const csv = await service.csv("responses");
    const [head, row] = csv.replace("﻿", "").split("\r\n");
    expect(head.startsWith("Respondent,Type,Submitted,Performance 1,")).toBe(true);
    expect(row.startsWith("R1,Student,")).toBe(true);
    expect(row.endsWith('"Sabi niya ""ok"", sige"')).toBe(true);
    expect(csv).not.toContain("Juan");
    expect(csv).not.toContain("@example.com");
  });

  it("clearResponses: binubura lahat at nila-log", async () => {
    const { service, all, stored, logs } = setup();
    await service.submit(student, { answers: all(5), comment: "" });
    expect(await service.clearResponses(admin.id)).toBe(1);
    expect(stored.size).toBe(0);
    expect(logs.create).toHaveBeenLastCalledWith(expect.objectContaining({ uid: admin.id, action: "delete", target: "piecesResponses (1 responses)" }));
  });
});
