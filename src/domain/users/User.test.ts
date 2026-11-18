import { describe, expect, it } from "vitest";
import { makeUser } from "@/test/factories";
import { Admin, Chairman, Student } from "./User";
import { StudentProfile } from "./StudentProfile";

describe("createUser (factory)", () => {
  it("gumagawa ng tamang subclass ayon sa role", () => {
    expect(makeUser("student")).toBeInstanceOf(Student);
    expect(makeUser("admin")).toBeInstanceOf(Admin);
    expect(makeUser("chairman")).toBeInstanceOf(Chairman);
  });

  it("ibinibigay ang tamang home page pagka-login", () => {
    expect(makeUser("student").homePath).toBe("/learn");
    expect(makeUser("admin").homePath).toBe("/admin");
    expect(makeUser("chairman").homePath).toBe("/oversight");
  });
});

describe("User.canAccess (role-based access control)", () => {
  it("student: sariling mga page lang", () => {
    const student = makeUser("student");
    expect(student.canAccess("/learn")).toBe(true);
    expect(student.canAccess("/learn/abc123/quiz")).toBe(true);
    expect(student.canAccess("/profile")).toBe(true);
    expect(student.canAccess("/admin")).toBe(false);
    expect(student.canAccess("/admin/settings")).toBe(false);
    expect(student.canAccess("/oversight")).toBe(false);
  });

  it("admin: Content Studio at preview ng Syllabus Board", () => {
    const admin = makeUser("admin");
    expect(admin.canAccess("/admin/students")).toBe(true);
    expect(admin.canAccess("/learn")).toBe(true);
    expect(admin.canAccess("/oversight")).toBe(false);
  });

  it("chairman: Oversight lang (read-only)", () => {
    const chairman = makeUser("chairman");
    expect(chairman.canAccess("/oversight")).toBe(true);
    expect(chairman.canAccess("/admin")).toBe(false);
    expect(chairman.canAccess("/learn")).toBe(false);
  });

  it("hindi nalilinlang ng route na kahawig lang ang simula (hal. /learning)", () => {
    expect(makeUser("student").canAccess("/learning")).toBe(false);
    expect(makeUser("admin").canAccess("/administrator")).toBe(false);
  });
});

describe("User status", () => {
  it("active at inactive na account", () => {
    expect(makeUser("student").isActive()).toBe(true);
    expect(makeUser("student", { status: "inactive" }).isActive()).toBe(false);
  });

  it("hindi nababago ang props mula sa labas (encapsulation)", () => {
    const user = makeUser("student");
    const props = user.toAccountProps();
    props.username = "changed";
    expect(user.username).toBe("student_user");
  });
});

describe("StudentProfile.fullName", () => {
  const base = {
    accountId: "u1",
    studentNumber: "2025-00123",
    course: "BS Information Technology",
    yearLevel: "1st Year",
    createdAt: new Date(),
  };

  it("ginagamit ang middle initial", () => {
    const profile = new StudentProfile("u1", { ...base, firstName: "Juan", middleName: "dela", lastName: "Cruz" });
    expect(profile.fullName).toBe("Juan D. Cruz");
  });

  it("walang dobleng espasyo kapag walang middle name", () => {
    const profile = new StudentProfile("u1", { ...base, firstName: "Ana", middleName: "", lastName: "Reyes" });
    expect(profile.fullName).toBe("Ana Reyes");
  });
});
