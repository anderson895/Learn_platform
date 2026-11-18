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

export const DEFAULT_SYLLABUS: Omit<SyllabusProps, "subjectId" | "createdAt"> = {
  courseDescription:
    "An introduction to computer programming using Java: problem solving, algorithms, data types, control structures, methods, arrays and an introduction to objects.",
  courseObjectives: "Write, trace and debug simple Java programs that solve well-defined problems.",
  learningOutcomes: "Design algorithms and implement them in Java using correct syntax and good programming style.",
};
