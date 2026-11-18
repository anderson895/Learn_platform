/**
 * Mga factory para sa unit tests (hindi ginagamit ng app).
 * Gumagawa ng domain objects na may makatwirang default, at puwedeng palitan ang anumang field.
 */
import { Lesson, type LessonProps } from "@/domain/content/Lesson";
import { emptyProgress, type LessonProgressProps } from "@/domain/progress/LessonProgress";
import { createUser, type AccountProps, type Role } from "@/domain/users/User";

export const FIXED_DATE = new Date("2026-11-18T08:00:00.000Z");

export function makeUser(role: Role, overrides: Partial<AccountProps> = {}, id = `${role}-1`) {
  return createUser(id, role, {
    username: `${role}_user`,
    email: `${role}@example.com`,
    status: "active",
    createdAt: FIXED_DATE,
    ...overrides,
  });
}

export function makeLesson(overrides: Partial<LessonProps> = {}, id = "lesson-1") {
  return new Lesson(id, {
    syllabusId: "cp1",
    order: 3,
    lessonTitle: "Control Structures",
    topics: ["if", "else", "switch"],
    lessonContent: "",
    noteId: null,
    videoFile: null,
    audioFile: null,
    passingThreshold: 75,
    status: "published",
    instructorName: "Prof. Santos",
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  });
}

export function makeProgress(lessonId: string, overrides: Partial<LessonProgressProps> = {}): LessonProgressProps {
  return { ...emptyProgress(lessonId), updatedAt: FIXED_DATE, ...overrides };
}
