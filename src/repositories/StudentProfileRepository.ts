import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { StudentProfile } from "@/domain/users/StudentProfile";
import { BaseRepository } from "./BaseRepository";

/** Hugis ng `students/{uid}` sa Firestore (Table 10). */
export interface StudentDocument {
  accountId: string;
  studentNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  course: string;
  yearLevel: string;
  createdAt: Timestamp;
}

export class StudentProfileRepository extends BaseRepository<StudentProfile, StudentDocument> {
  protected readonly collectionName = "students";

  isStudentNumberTaken(studentNumber: string): Promise<boolean> {
    return this.existsWhere("studentNumber", studentNumber.trim().toUpperCase());
  }

  protected toEntity(id: string, data: StudentDocument): StudentProfile {
    return new StudentProfile(id, { ...data, createdAt: data.createdAt.toDate() });
  }

  protected toDocument(profile: StudentProfile): StudentDocument {
    const props = profile.toProps();
    return { ...props, studentNumber: props.studentNumber.toUpperCase(), createdAt: Timestamp.fromDate(props.createdAt) };
  }
}
