export type PublishStatus = "draft" | "published";

/** Video o audio na naka-store sa Cloudinary. */
export interface MediaFile {
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
  duration: number | null;
  originalFilename: string;
}

/** Mga field ng `lessons/{id}` (Table 6 ng PDF, at ang mga idinagdag sa plan). */
export interface LessonProps {
  syllabusId: string;
  order: number; // 1, 2, 3... (pagkakasunod sa syllabus)
  lessonTitle: string;
  topics: string[];
  lessonContent: string; // maikling buod; ang buong notes ay nasa Notes Repository
  noteId: string | null;
  videoFile: MediaFile | null;
  audioFile: MediaFile | null;
  passingThreshold: number; // porsyento para ma-unlock ang susunod na lesson
  status: PublishStatus;
  instructorName: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Plain na bersyon ng Lesson para maipasa sa Client Components. */
export type LessonDTO = Omit<LessonProps, "createdAt" | "updatedAt"> & {
  id: string;
  chapterLabel: string;
  mediaCode: string;
  quizCode: string;
  createdAt: string;
  updatedAt: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Isang module/lesson ng Computer Programming 1 syllabus. */
export class Lesson {
  constructor(
    public readonly id: string,
    private readonly props: LessonProps,
  ) {}

  get order(): number {
    return this.props.order;
  }
  get title(): string {
    return this.props.lessonTitle;
  }
  get passingThreshold(): number {
    return this.props.passingThreshold;
  }
  get noteId(): string | null {
    return this.props.noteId;
  }
  /** hal. "Ch. 03" */
  get chapterLabel(): string {
    return `Ch. ${pad(this.props.order)}`;
  }
  /** hal. "VID-003" (Fig. 15) */
  get mediaCode(): string {
    return `VID-${String(this.props.order).padStart(3, "0")}`;
  }
  /** hal. "QZ-003" (Fig. 15) */
  get quizCode(): string {
    return `QZ-${String(this.props.order).padStart(3, "0")}`;
  }
  isPublished(): boolean {
    return this.props.status === "published";
  }
  hasVideo(): boolean {
    return Boolean(this.props.videoFile);
  }
  hasNotes(): boolean {
    return Boolean(this.props.noteId);
  }

  toProps(): LessonProps {
    return { ...this.props, topics: [...this.props.topics] };
  }

  toDTO(): LessonDTO {
    return {
      ...this.toProps(),
      id: this.id,
      chapterLabel: this.chapterLabel,
      mediaCode: this.mediaCode,
      quizCode: this.quizCode,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
