import type { PublishStatus } from "./Lesson";

export interface NoteProps {
  title: string;
  markdown: string;
  status: PublishStatus;
  lessonId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDTO = Omit<NoteProps, "createdAt" | "updatedAt"> & { id: string; createdAt: string; updatedAt: string };

/** Lecture script sa Notes Repository (Fig. 10). Kapag published at naka-link sa lesson, ito ang notes na nakikita ng student. */
export class Note {
  constructor(
    public readonly id: string,
    private readonly props: NoteProps,
  ) {}

  get lessonId(): string | null {
    return this.props.lessonId;
  }
  get markdown(): string {
    return this.props.markdown;
  }
  isPublished(): boolean {
    return this.props.status === "published";
  }
  toProps(): NoteProps {
    return { ...this.props };
  }
  toDTO(): NoteDTO {
    return { ...this.props, id: this.id, createdAt: this.props.createdAt.toISOString(), updatedAt: this.props.updatedAt.toISOString() };
  }
}

export interface CodeSnippetProps {
  filename: string;
  code: string;
  createdAt: Date;
}
export type CodeSnippetDTO = { id: string; filename: string; code: string };
