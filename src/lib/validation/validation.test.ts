import { describe, expect, it } from "vitest";
import { defaultQuestionnaire } from "@/domain/evaluation/Pieces";
import { piecesAnswerSchema, questionnaireSchema } from "./evaluation";
import { activitySchema, exerciseSchema, gradeSchema, quizSchema } from "./assessment";
import { lessonSchema, noteSchema, snippetSchema } from "./content";
import { changePasswordSchema, fieldErrorsOf, formValues, loginSchema, registrationSchema, studentDetailsSchema } from "./student";

const validRegistration = {
  firstName: " Juan ",
  middleName: "",
  lastName: "Dela Cruz",
  studentNumber: " 2025-00123 ",
  course: "BS Information Technology",
  yearLevel: "1st Year",
  username: "  Juan.DC ",
  email: " Juan@Example.COM ",
  password: "Student123",
  confirmPassword: "Student123",
};

describe("registrationSchema (Student Registration)", () => {
  it("tinatanggap ang tamang input at nililinis ito", () => {
    const parsed = registrationSchema.parse(validRegistration);
    expect(parsed.firstName).toBe("Juan");
    expect(parsed.username).toBe("juan.dc");
    expect(parsed.email).toBe("juan@example.com");
    expect(parsed.studentNumber).toBe("2025-00123");
  });

  it("ginagawang uppercase ang student number", () => {
    expect(studentDetailsSchema.parse({ ...validRegistration, studentNumber: "stu-001" }).studentNumber).toBe("STU-001");
  });

  it("dapat magkapareho ang password at confirm password", () => {
    const result = registrationSchema.safeParse({ ...validRegistration, confirmPassword: "Different123" });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)).toEqual({ confirmPassword: "Passwords do not match." });
  });

  it.each([
    ["Short1", "Password must be at least 8 characters."],
    ["onlyletters", "Password must include a number."],
    ["12345678", "Password must include a letter."],
  ])("mahinang password: %s", (password, message) => {
    const result = registrationSchema.safeParse({ ...validRegistration, password, confirmPassword: password });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!).password).toBe(message);
  });

  it("tinatanggihan ang maling email, username at course", () => {
    const result = registrationSchema.safeParse({ ...validRegistration, email: "not-an-email", username: "juan dc!", course: "BS Nursing" });
    const errors = fieldErrorsOf(result.error!);
    expect(errors.email).toBe("Enter a valid email address.");
    expect(errors.username).toBe("Use letters, numbers, dots and underscores only.");
    expect(errors.course).toBe("Select a course.");
  });

  it("kailangan ang first at last name", () => {
    const errors = fieldErrorsOf(registrationSchema.safeParse({ ...validRegistration, firstName: "   ", lastName: "" }).error!);
    expect(errors.firstName).toBe("First name is required.");
    expect(errors.lastName).toBe("Last name is required.");
  });
});

describe("changePasswordSchema", () => {
  it("bawal gamitin ulit ang kasalukuyang password", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "Student123", newPassword: "Student123", confirmPassword: "Student123" });
    expect(fieldErrorsOf(result.error!).newPassword).toBe("Use a different password.");
  });

  it("tinatanggap ang bagong password na tugma ang confirm", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "Student123", newPassword: "Student456", confirmPassword: "Student456" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("kailangan ang portal, username/email at password", () => {
    expect(loginSchema.safeParse({ portal: "student", identifier: "juan", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ portal: "teacher", identifier: "juan", password: "x" }).success).toBe(false);
    expect(fieldErrorsOf(loginSchema.safeParse({ portal: "student", identifier: "  ", password: "" }).error!)).toEqual({
      identifier: "Enter your username or email.",
      password: "Enter your password.",
    });
  });
});

describe("form helpers", () => {
  it("fieldErrorsOf: unang error lang bawat field", () => {
    const result = registrationSchema.safeParse({ ...validRegistration, password: "abc", confirmPassword: "abc" });
    expect(fieldErrorsOf(result.error!).password).toBe("Password must be at least 8 characters.");
  });

  it("formValues: string ang lahat, at blangko ang nawawala", () => {
    const data = new FormData();
    data.set("firstName", "Juan");
    expect(formValues(data, ["firstName", "lastName"])).toEqual({ firstName: "Juan", lastName: "" });
  });
});

describe("lessonSchema (Syllabus Builder)", () => {
  const base = { lessonTitle: "Control Structures", topics: "", lessonContent: "", passingThreshold: "75", instructorName: "", status: "draft" };

  it("hinahati ang topics sa kuwit at tinatanggal ang blangko", () => {
    expect(lessonSchema.parse({ ...base, topics: " if , else if,, switch " }).topics).toEqual(["if", "else if", "switch"]);
  });

  it("ginagawang number ang passing score mula sa form", () => {
    expect(lessonSchema.parse(base).passingThreshold).toBe(75);
  });

  it.each(["101", "-1", "75.5", "abc"])("tinatanggihan ang passing score na %s", (value) => {
    expect(lessonSchema.safeParse({ ...base, passingThreshold: value }).success).toBe(false);
  });

  it("hanggang 12 topics lang", () => {
    const topics = Array.from({ length: 13 }, (_, index) => `t${index}`).join(",");
    expect(fieldErrorsOf(lessonSchema.safeParse({ ...base, topics }).error!).topics).toBe("Use at most 12 topics.");
  });
});

describe("noteSchema at snippetSchema (Notes Repository)", () => {
  it("ang blangkong lessonId ay nagiging null (hindi naka-link)", () => {
    expect(noteSchema.parse({ title: "Notes", markdown: "# Hi", lessonId: "", status: "draft" }).lessonId).toBeNull();
  });

  it("ligtas na file name lang ang tinatanggap", () => {
    expect(snippetSchema.safeParse({ filename: "IfElse.java", code: "if (x) {}" }).success).toBe(true);
    expect(snippetSchema.safeParse({ filename: "../secret.java", code: "x" }).success).toBe(false);
  });
});

describe("assessment schemas (Assessment Builder)", () => {
  it("activity: kailangan ng hindi bababa sa 2 linya ng code", () => {
    expect(activitySchema.safeParse({ title: "Seq", instructions: "", solution: "int x = 1;\n\n" }).success).toBe(false);
    expect(activitySchema.safeParse({ title: "Seq", instructions: "", solution: "int x = 1;\nx++;" }).success).toBe(true);
  });

  it("exercise: max score mula 1 hanggang 1000", () => {
    const base = { title: "Ex", instructions: "Do it", starterCode: "", modelSolution: "" };
    expect(exerciseSchema.parse({ ...base, maxScore: "100" }).maxScore).toBe(100);
    expect(exerciseSchema.safeParse({ ...base, maxScore: "0" }).success).toBe(false);
  });

  it("quiz: kailangang may napiling tamang sagot ang bawat tanong", () => {
    const question = { prompt: "Q?", code: "", choices: ["A", "B", "C", "D"], correctIndex: -1 };
    const result = quizSchema.safeParse({ title: "Quiz", timeLimit: "15", questions: [question] });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path.join(".")).toBe("questions.0.correctIndex");
    expect(quizSchema.safeParse({ title: "Quiz", timeLimit: "15", questions: [{ ...question, correctIndex: 2 }] }).success).toBe(true);
  });

  it("quiz: time limit mula 0 hanggang 180 minuto, at may kahit isang tanong", () => {
    const question = { prompt: "Q?", code: "", choices: ["A", "B"], correctIndex: 0 };
    expect(quizSchema.safeParse({ title: "Quiz", timeLimit: "181", questions: [question] }).success).toBe(false);
    expect(quizSchema.safeParse({ title: "Quiz", timeLimit: "0", questions: [] }).success).toBe(false);
  });

  it("grade: bawal ang negatibong score", () => {
    expect(gradeSchema.safeParse({ score: "-5", feedback: "" }).success).toBe(false);
    expect(gradeSchema.parse({ score: "90", feedback: "Good" }).score).toBe(90);
  });
});

describe("PIECES questionnaireSchema at piecesAnswerSchema", () => {
  const base = () => defaultQuestionnaire();

  it("tinatanggap ang default na questionnaire", () => {
    expect(questionnaireSchema.safeParse(base()).success).toBe(true);
  });

  it("hindi puwedeng mawala o magpalit ng ayos ang anim na criterion", () => {
    const swapped = base();
    [swapped.criteria[0], swapped.criteria[1]] = [swapped.criteria[1], swapped.criteria[0]];
    expect(questionnaireSchema.safeParse(swapped).success).toBe(false);
    expect(questionnaireSchema.safeParse({ ...base(), criteria: base().criteria.slice(1) }).success).toBe(false);
  });

  it("bawal ang walang tanong, blangkong tanong at dobleng ID", () => {
    const empty = base();
    empty.criteria[2].items = [];
    expect(questionnaireSchema.safeParse(empty).success).toBe(false);
    const blank = base();
    blank.criteria[0].items[0].text = "   ";
    expect(questionnaireSchema.safeParse(blank).success).toBe(false);
    const duplicate = base();
    duplicate.criteria[1].items[0].id = duplicate.criteria[0].items[0].id;
    expect(questionnaireSchema.safeParse(duplicate).success).toBe(false);
  });

  it("sagot: 1 hanggang 5 lang, buong numero", () => {
    expect(piecesAnswerSchema.safeParse({ answers: { per1: 5 } }).success).toBe(true);
    expect(piecesAnswerSchema.safeParse({ answers: { per1: 0 } }).success).toBe(false);
    expect(piecesAnswerSchema.safeParse({ answers: { per1: 3.5 } }).success).toBe(false);
    expect(piecesAnswerSchema.parse({ answers: {} }).comment).toBe("");
  });
});
