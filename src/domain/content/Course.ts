import { CP1_COURSE } from "./Cp1Syllabus";

/** Subject (Table 4) at Syllabus (Table 5). Iisa ang subject at syllabus ng sistema: Computer Programming 1. */
export interface SubjectProps {
  subjectCode: string;
  subjectName: string;
  yearLevel: string;
  academicYear: string;
}

export interface SyllabusProps {
  subjectId: string;
  courseDescription: string;
  courseObjectives: string;
  learningOutcomes: string;
  createdAt: Date;
}

export type CourseDTO = SubjectProps &
  Omit<SyllabusProps, "createdAt" | "subjectId"> & { subjectId: string; syllabusId: string };

export const DEFAULT_SUBJECT: SubjectProps = {
  subjectCode: "CP1",
  subjectName: "Computer Programming 1",
  yearLevel: "1st Year",
  academicYear: "2026-2027",
};

/** Galing sa UEP Computer Programming 1 syllabus (tingnan ang `Cp1Syllabus.ts`). */
export const DEFAULT_SYLLABUS: Omit<SyllabusProps, "subjectId" | "createdAt"> = { ...CP1_COURSE };
