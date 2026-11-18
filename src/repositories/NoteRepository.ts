import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { Note, type CodeSnippetProps, type NoteProps } from "@/domain/content/Note";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

type NoteDocument = Omit<NoteProps, "createdAt" | "updatedAt"> & { createdAt: Timestamp; updatedAt: Timestamp };

/** `notes/{id}`: Notes Repository (Fig. 10). */
export class NoteRepository extends BaseRepository<Note, NoteDocument> {
  protected readonly collectionName = "notes";

  async listRecent(): Promise<Note[]> {
    return (await this.findAll()).sort((a, b) => b.toProps().updatedAt.getTime() - a.toProps().updatedAt.getTime());
  }

  protected toEntity(id: string, data: NoteDocument): Note {
    return new Note(id, { ...data, lessonId: data.lessonId ?? null, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) });
  }

  protected toDocument(note: Note): NoteDocument {
    const props = note.toProps();
    return { ...props, createdAt: toTimestamp(props.createdAt), updatedAt: toTimestamp(props.updatedAt) };
  }
}

export type CodeSnippetEntity = CodeSnippetProps & { id: string };
type CodeSnippetDocument = Omit<CodeSnippetProps, "createdAt"> & { createdAt: Timestamp };

/** `codeSnippets/{id}`: mga Java snippet na puwedeng ipasok sa notes. */
export class CodeSnippetRepository extends BaseRepository<CodeSnippetEntity, CodeSnippetDocument> {
  protected readonly collectionName = "codeSnippets";
  protected toEntity(id: string, data: CodeSnippetDocument): CodeSnippetEntity {
    return { id, ...data, createdAt: toDate(data.createdAt) };
  }
  protected toDocument({ id: _id, ...data }: CodeSnippetEntity): CodeSnippetDocument {
    return { ...data, createdAt: toTimestamp(data.createdAt) };
  }
}
