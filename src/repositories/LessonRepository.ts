import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { Lesson, type LessonProps } from "@/domain/content/Lesson";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

type LessonDocument = Omit<LessonProps, "createdAt" | "updatedAt"> & { createdAt: Timestamp; updatedAt: Timestamp };

/** `lessons/{id}` (Table 6). */
export class LessonRepository extends BaseRepository<Lesson, LessonDocument> {
  protected readonly collectionName = "lessons";

  /** Lahat ng lesson ng syllabus, ayon sa pagkakasunod. */
  async listBySyllabus(syllabusId: string): Promise<Lesson[]> {
    return (await this.findWhere("syllabusId", syllabusId)).sort((a, b) => a.order - b.order);
  }

  protected toEntity(id: string, data: LessonDocument): Lesson {
    return new Lesson(id, {
      ...data,
      topics: data.topics ?? [],
      noteId: data.noteId ?? null,
      videoFile: data.videoFile ?? null,
      audioFile: data.audioFile ?? null,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }

  protected toDocument(lesson: Lesson): LessonDocument {
    const props = lesson.toProps();
    return { ...props, createdAt: toTimestamp(props.createdAt), updatedAt: toTimestamp(props.updatedAt) };
  }
}
