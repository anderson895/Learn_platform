import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { SubjectProps, SyllabusProps } from "@/domain/content/Course";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

export type SubjectEntity = SubjectProps & { id: string };
export type SyllabusEntity = SyllabusProps & { id: string };

/** `subjects/{id}` (Table 4). */
export class SubjectRepository extends BaseRepository<SubjectEntity, SubjectProps> {
  protected readonly collectionName = "subjects";
  protected toEntity(id: string, data: SubjectProps): SubjectEntity {
    return { id, ...data };
  }
  protected toDocument({ id: _id, ...data }: SubjectEntity): SubjectProps {
    return data;
  }
}

type SyllabusDocument = Omit<SyllabusProps, "createdAt"> & { createdAt: Timestamp };

/** `syllabi/{id}` (Table 5). */
export class SyllabusRepository extends BaseRepository<SyllabusEntity, SyllabusDocument> {
  protected readonly collectionName = "syllabi";
  protected toEntity(id: string, data: SyllabusDocument): SyllabusEntity {
    return { id, ...data, createdAt: toDate(data.createdAt) };
  }
  protected toDocument({ id: _id, ...data }: SyllabusEntity): SyllabusDocument {
    return { ...data, createdAt: toTimestamp(data.createdAt) };
  }
}
