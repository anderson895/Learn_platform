import "server-only";
import type { CollectionReference, Timestamp } from "firebase-admin/firestore";
import type { LessonProgressProps } from "@/domain/progress/LessonProgress";
import { getAdminDb } from "@/lib/firebase/admin";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

// ── submissions/{id}: ang sagot ng student (student na bahagi ng Tables 7-9) ─

export type SubmissionRefType = "activity" | "codingExercise" | "quiz";
export type CompletionStatus = "in_progress" | "completed" | "submitted" | "graded";

export type Submission = {
  id: string;
  studentId: string;
  lessonId: string;
  refType: SubmissionRefType;
  refId: string;
  submission: string; // JSON ng sagot (quiz/activity)
  solutionCode: string; // isinulat na Java code (coding exercise)
  score: number | null;
  maxScore: number;
  completionStatus: CompletionStatus;
  passed: boolean | null;
  feedback: string;
  details: string; // JSON ng resulta bawat tanong o posisyon
  gradedBy: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
};

type SubmissionDocument = Omit<Submission, "id" | "startedAt" | "submittedAt" | "gradedAt"> & {
  startedAt: Timestamp;
  submittedAt: Timestamp | null;
  gradedAt: Timestamp | null;
};

export class SubmissionRepository extends BaseRepository<Submission, SubmissionDocument> {
  protected readonly collectionName = "submissions";

  listByStudent(studentId: string) {
    return this.findWhere("studentId", studentId);
  }

  async listByRef(refId: string) {
    return this.findWhere("refId", refId);
  }

  async findForStudentRef(studentId: string, refId: string): Promise<Submission[]> {
    return (await this.findWhere("refId", refId)).filter((submission) => submission.studentId === studentId);
  }

  protected toEntity(id: string, data: SubmissionDocument): Submission {
    return {
      ...data,
      id,
      startedAt: toDate(data.startedAt),
      submittedAt: data.submittedAt ? toDate(data.submittedAt) : null,
      gradedAt: data.gradedAt ? toDate(data.gradedAt) : null,
    };
  }

  protected toDocument({ id: _id, startedAt, submittedAt, gradedAt, ...data }: Submission): SubmissionDocument {
    return {
      ...data,
      startedAt: toTimestamp(startedAt),
      submittedAt: submittedAt ? toTimestamp(submittedAt) : null,
      gradedAt: gradedAt ? toTimestamp(gradedAt) : null,
    };
  }
}

// ── progress/{studentId}/lessons/{lessonId} ─────────────────────────────────

type ProgressDocument = Omit<LessonProgressProps, "completedAt" | "updatedAt"> & { completedAt: Timestamp | null; updatedAt: Timestamp };

/** Progress ng isang student. Ang document ID ay ang lessonId. */
export class ProgressRepository extends BaseRepository<LessonProgressProps, ProgressDocument> {
  protected readonly collectionName: string;

  constructor(public readonly studentId: string) {
    super();
    this.collectionName = `progress/${studentId}/lessons`;
  }

  protected get collection(): CollectionReference<ProgressDocument> {
    return getAdminDb().collection("progress").doc(this.studentId).collection("lessons") as CollectionReference<ProgressDocument>;
  }

  ref(lessonId: string) {
    return this.collection.doc(lessonId);
  }

  async asMap(): Promise<Map<string, LessonProgressProps>> {
    return new Map((await this.findAll()).map((entry) => [entry.lessonId, entry]));
  }

  fromDocument(lessonId: string, data: ProgressDocument | undefined): LessonProgressProps | null {
    return data ? this.toEntity(lessonId, data) : null;
  }

  serialize(progress: LessonProgressProps): ProgressDocument {
    return this.toDocument(progress);
  }

  protected toEntity(id: string, data: ProgressDocument): LessonProgressProps {
    return {
      ...data,
      lessonId: data.lessonId ?? id,
      activitiesDone: data.activitiesDone ?? [],
      exercisesSubmitted: data.exercisesSubmitted ?? [],
      completedAt: data.completedAt ? toDate(data.completedAt) : null,
      updatedAt: toDate(data.updatedAt),
    };
  }

  protected toDocument(progress: LessonProgressProps): ProgressDocument {
    return {
      ...progress,
      completedAt: progress.completedAt ? toTimestamp(progress.completedAt) : null,
      updatedAt: toTimestamp(progress.updatedAt),
    };
  }
}
