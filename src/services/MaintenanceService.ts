import "server-only";
import { Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { AccountRepository } from "@/repositories/AccountRepository";
import { AuditLogRepository } from "@/repositories/AuditLogRepository";

/** Mga collection na isasama sa backup. */
const BACKUP_COLLECTIONS = [
  "accounts", "students", "subjects", "syllabi", "lessons", "notes", "codeSnippets", "media",
  "activities", "codingExercises", "quizzes", "answerKeys", "submissions", "announcements", "settings", "auditLogs",
] as const;

async function deleteRefs(refs: DocumentReference[]): Promise<number> {
  const db = getAdminDb();
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  return refs.length;
}

/** Ginagawang JSON-friendly ang Firestore data (Timestamp → ISO string). */
function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  return value;
}

/**
 * System Maintenance (Fig. 5): mga tool para sa testing at backup.
 * - I-reset ang progress at submissions ng student, para masubukan ulit ang mga quiz at unlock.
 * - Burahin nang tuluyan ang test student account, para magamit ulit ang email at username.
 */
export class MaintenanceService {
  constructor(
    private readonly accounts = new AccountRepository(),
    private readonly logs = new AuditLogRepository(),
  ) {}

  private async studentIds(target: string): Promise<string[]> {
    if (target !== "all") {
      const account = await this.accounts.findById(target);
      if (!account || account.role !== "student") throw new Error("Student not found.");
      return [target];
    }
    return (await this.accounts.findWhere("role", "student")).map((account) => account.id);
  }

  private async progressAndSubmissionRefs(uid: string): Promise<{ progress: DocumentReference[]; submissions: DocumentReference[] }> {
    const db = getAdminDb();
    const [progress, submissions] = await Promise.all([
      db.collection("progress").doc(uid).collection("lessons").listDocuments(),
      db.collection("submissions").where("studentId", "==", uid).get(),
    ]);
    return { progress, submissions: submissions.docs.map((doc) => doc.ref) };
  }

  /** Binubura ang progress at submissions ng isang student, o ng lahat (`"all"`). Hindi binubura ang account. */
  async resetStudentData(target: string, actorUid: string): Promise<{ students: number; progress: number; submissions: number }> {
    const ids = await this.studentIds(target);
    let progress = 0;
    let submissions = 0;
    for (const uid of ids) {
      const refs = await this.progressAndSubmissionRefs(uid);
      progress += await deleteRefs(refs.progress);
      submissions += await deleteRefs(refs.submissions);
    }
    await this.log(actorUid, "delete", `reset:${target === "all" ? "all students" : `students/${target}`}`);
    return { students: ids.length, progress, submissions };
  }

  /** Tuluyang binubura ang student (Auth user, account, profile, progress at submissions). */
  async deleteStudentAccount(uid: string, actorUid: string): Promise<void> {
    const [id] = await this.studentIds(uid);
    const db = getAdminDb();
    const refs = await this.progressAndSubmissionRefs(id);
    await deleteRefs([...refs.progress, ...refs.submissions, db.collection("accounts").doc(id), db.collection("students").doc(id)]);
    await getAdminAuth()
      .deleteUser(id)
      .catch((error: { code?: string }) => {
        if (error.code !== "auth/user-not-found") throw error;
      });
    await this.log(actorUid, "delete", `accounts/${id}`);
  }

  /** Binubura ang lahat ng audit log (may iiwang isang entry tungkol sa pagbura). */
  async clearAuditLogs(actorUid: string): Promise<number> {
    const refs = await getAdminDb().collection("auditLogs").listDocuments();
    const count = await deleteRefs(refs);
    await this.log(actorUid, "delete", `auditLogs (${count} entries)`);
    return count;
  }

  /** Backup Database (Fig. 5): JSON ng lahat ng data, kasama ang progress ng bawat student. */
  async backup(): Promise<Record<string, unknown>> {
    const db = getAdminDb();
    const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID };
    for (const name of BACKUP_COLLECTIONS) {
      const snap = await db.collection(name).get();
      data[name] = Object.fromEntries(snap.docs.map((doc) => [doc.id, plain(doc.data())]));
    }
    const progress: Record<string, unknown> = {};
    for (const student of await db.collection("progress").listDocuments()) {
      const lessons = await student.collection("lessons").get();
      progress[student.id] = Object.fromEntries(lessons.docs.map((doc) => [doc.id, plain(doc.data())]));
    }
    data.progress = progress;
    return data;
  }

  private async log(uid: string, action: "delete", target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
