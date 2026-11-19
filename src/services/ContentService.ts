import "server-only";
import { CP1_MODULES, moduleSummary } from "@/domain/content/Cp1Syllabus";
import { DEFAULT_SUBJECT, DEFAULT_SYLLABUS, type CourseDTO, type SubjectProps, type SyllabusProps } from "@/domain/content/Course";
import { Lesson, type LessonProps, type MediaFile, type PublishStatus } from "@/domain/content/Lesson";
import { Note } from "@/domain/content/Note";
import { getAdminDb } from "@/lib/firebase/admin";
import { AuditLogRepository, type AuditLogEntry } from "@/repositories/AuditLogRepository";
import { SubjectRepository, SyllabusRepository } from "@/repositories/CourseRepositories";
import { LessonRepository } from "@/repositories/LessonRepository";
import { toTimestamp } from "@/repositories/firestore";
import { CodeSnippetRepository, NoteRepository } from "@/repositories/NoteRepository";

export const DEFAULT_THRESHOLD = 75;


export type LessonInput = {
  lessonTitle: string;
  topics: string[];
  lessonContent: string;
  passingThreshold: number;
  status: PublishStatus;
  instructorName: string;
};

/** Mga collection na may `lessonId` at kailangang burahin kasama ng lesson. */
const LESSON_CHILD_COLLECTIONS = ["activities", "codingExercises", "quizzes", "submissions"] as const;

/** Faculty Control Module (Fig. 6): subject, syllabus, lessons, notes at code snippets. */
export class ContentService {
  constructor(
    private readonly subjects = new SubjectRepository(),
    private readonly syllabi = new SyllabusRepository(),
    private readonly lessons = new LessonRepository(),
    private readonly notes = new NoteRepository(),
    private readonly snippets = new CodeSnippetRepository(),
    private readonly logs = new AuditLogRepository(),
  ) {}

  // ── Course (Subject + Syllabus) ────────────────────────────────────────────

  private coursePromise: Promise<CourseDTO> | null = null;

  /**
   * Ang iisang subject at syllabus ng sistema. Ginagawa ito kapag wala pa, gamit ang fixed na ID na "cp1",
   * kaya kahit sabay itong tawagin ay hindi magkakaroon ng dalawang subject.
   */
  getCourse(): Promise<CourseDTO> {
    this.coursePromise ??= this.loadCourse();
    return this.coursePromise;
  }

  private async loadCourse(): Promise<CourseDTO> {
    const COURSE_ID = "cp1";
    let subject = (await this.subjects.findById(COURSE_ID)) ?? (await this.subjects.findAll())[0];
    if (!subject) {
      subject = { id: COURSE_ID, ...DEFAULT_SUBJECT };
      await this.subjects.create(subject, COURSE_ID);
    }
    let syllabus = (await this.syllabi.findById(COURSE_ID)) ?? (await this.syllabi.findWhere("subjectId", subject.id))[0];
    if (!syllabus) {
      syllabus = { id: COURSE_ID, subjectId: subject.id, ...DEFAULT_SYLLABUS, createdAt: new Date() };
      await this.syllabi.create(syllabus, COURSE_ID);
    }
    const { id: subjectId, ...subjectProps } = subject;
    return {
      ...subjectProps,
      subjectId,
      syllabusId: syllabus.id,
      courseDescription: syllabus.courseDescription,
      courseObjectives: syllabus.courseObjectives,
      learningOutcomes: syllabus.learningOutcomes,
    };
  }

  async updateCourse(input: SubjectProps & Pick<SyllabusProps, "courseDescription" | "courseObjectives" | "learningOutcomes">, actorUid: string) {
    const course = await this.getCourse();
    const { courseDescription, courseObjectives, learningOutcomes, ...subject } = input;
    await Promise.all([
      this.subjects.update(course.subjectId, subject),
      this.syllabi.update(course.syllabusId, { courseDescription, courseObjectives, learningOutcomes }),
    ]);
    this.coursePromise = null;
    await this.log(actorUid, "update", "syllabus");
  }

  // ── Lessons ────────────────────────────────────────────────────────────────

  async listLessons(options: { publishedOnly?: boolean } = {}): Promise<Lesson[]> {
    const { syllabusId } = await this.getCourse();
    const lessons = await this.lessons.listBySyllabus(syllabusId);
    return options.publishedOnly ? lessons.filter((lesson) => lesson.isPublished()) : lessons;
  }

  getLesson(id: string): Promise<Lesson | null> {
    return this.lessons.findById(id);
  }

  async saveLesson(id: string | null, input: LessonInput, actorUid: string): Promise<string> {
    const now = new Date();
    if (id) {
      await this.lessons.update(id, { ...input, updatedAt: toTimestamp(now) });
      await this.log(actorUid, "update", `lessons/${id}`);
      return id;
    }
    const { syllabusId } = await this.getCourse();
    const existing = await this.lessons.listBySyllabus(syllabusId);
    const props: LessonProps = {
      ...input,
      syllabusId,
      order: existing.length + 1,
      noteId: null,
      videoFile: null,
      audioFile: null,
      createdAt: now,
      updatedAt: now,
    };
    const newId = await this.lessons.create(new Lesson("", props));
    await this.log(actorUid, "create", `lessons/${newId}`);
    return newId;
  }

  async setLessonStatus(id: string, status: PublishStatus, actorUid: string) {
    await this.lessons.update(id, { status, updatedAt: toTimestamp(new Date()) });
    await this.log(actorUid, status === "published" ? "publish" : "update", `lessons/${id}`);
  }

  async setLessonMedia(id: string, kind: "videoFile" | "audioFile", media: MediaFile | null, actorUid: string) {
    await this.lessons.update(id, kind === "videoFile" ? { videoFile: media, updatedAt: toTimestamp(new Date()) } : { audioFile: media, updatedAt: toTimestamp(new Date()) });
    await this.log(actorUid, "update", `lessons/${id}:${kind}`);
  }

  /** Inaayos ang pagkakasunod ng mga lesson ayon sa listahan ng ID (Syllabus Builder drag/move). */
  async reorderLessons(orderedIds: string[], actorUid: string) {
    const batch = getAdminDb().batch();
    orderedIds.forEach((lessonId, index) => batch.update(getAdminDb().collection("lessons").doc(lessonId), { order: index + 1 }));
    await batch.commit();
    await this.log(actorUid, "update", "lessons:order");
  }

  /** Binubura ang lesson at lahat ng kaugnay nito (assessments, answer keys, submissions at progress). */
  async deleteLesson(id: string, actorUid: string) {
    const db = getAdminDb();
    const refs = [];
    for (const name of LESSON_CHILD_COLLECTIONS) {
      const snap = await db.collection(name).where("lessonId", "==", id).get();
      for (const doc of snap.docs) {
        refs.push(doc.ref);
        if (name !== "submissions") refs.push(db.collection("answerKeys").doc(doc.id));
      }
    }
    const students = await db.collection("students").get();
    students.docs.forEach((student) => refs.push(db.collection("progress").doc(student.id).collection("lessons").doc(id)));

    const linkedNotes = await this.notes.findWhere("lessonId", id);
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    await Promise.all(linkedNotes.map((note) => this.notes.update(note.id, { lessonId: null })));
    await this.lessons.delete(id);

    const remaining = await this.listLessons();
    await this.reorderLessons(remaining.map((lesson) => lesson.id), actorUid);
    await this.log(actorUid, "delete", `lessons/${id}`);
  }

  /** Nilalagyan ang bakanteng syllabus ng 12 module ng UEP Computer Programming 1 syllabus (draft lahat). */
  async seedSampleLessons(instructorName: string, actorUid: string, passingThreshold = DEFAULT_THRESHOLD): Promise<number> {
    if ((await this.listLessons()).length > 0) return 0;
    for (const item of CP1_MODULES) {
      await this.saveLesson(
        null,
        {
          lessonTitle: item.title,
          topics: item.topics,
          lessonContent: moduleSummary(item),
          passingThreshold,
          status: "draft",
          instructorName,
        },
        actorUid,
      );
    }
    return CP1_MODULES.length;
  }

  // ── Notes Repository ──────────────────────────────────────────────────────

  listNotes(): Promise<Note[]> {
    return this.notes.listRecent();
  }

  /** Ang published na notes ng lesson (para sa student), o `null`. */
  async getPublishedNote(lesson: Lesson): Promise<Note | null> {
    if (!lesson.noteId) return null;
    const note = await this.notes.findById(lesson.noteId);
    return note && note.isPublished() ? note : null;
  }

  async saveNote(
    id: string | null,
    input: { title: string; markdown: string; lessonId: string | null; status: PublishStatus },
    actorUid: string,
  ): Promise<string> {
    const now = new Date();
    const previous = id ? await this.notes.findById(id) : null;
    let noteId = id;
    if (previous && id) {
      await this.notes.update(id, { ...input, updatedAt: toTimestamp(now) });
    } else {
      noteId = await this.notes.create(new Note("", { ...input, createdAt: now, updatedAt: now }));
    }

    // Panatilihing tama ang `lesson.noteId`.
    const previousLessonId = previous?.lessonId ?? null;
    if (previousLessonId && previousLessonId !== input.lessonId) {
      const oldLesson = await this.lessons.findById(previousLessonId);
      if (oldLesson?.noteId === noteId) await this.lessons.update(previousLessonId, { noteId: null });
    }
    if (input.lessonId) await this.lessons.update(input.lessonId, { noteId, updatedAt: toTimestamp(now) });

    await this.log(actorUid, input.status === "published" ? "publish" : "update", `notes/${noteId}`);
    return noteId!;
  }

  async deleteNote(id: string, actorUid: string) {
    const note = await this.notes.findById(id);
    if (note?.lessonId) {
      const lesson = await this.lessons.findById(note.lessonId);
      if (lesson?.noteId === id) await this.lessons.update(note.lessonId, { noteId: null });
    }
    await this.notes.delete(id);
    await this.log(actorUid, "delete", `notes/${id}`);
  }

  // ── Code Snippets ─────────────────────────────────────────────────────────

  async listSnippets() {
    return (await this.snippets.findAll()).sort((a, b) => a.filename.localeCompare(b.filename));
  }

  async saveSnippet(input: { filename: string; code: string }, actorUid: string) {
    const id = await this.snippets.create({ id: "", ...input, createdAt: new Date() });
    await this.log(actorUid, "create", `codeSnippets/${id}`);
    return id;
  }

  async deleteSnippet(id: string, actorUid: string) {
    await this.snippets.delete(id);
    await this.log(actorUid, "delete", `codeSnippets/${id}`);
  }

  private async log(uid: string, action: AuditLogEntry["action"], target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
