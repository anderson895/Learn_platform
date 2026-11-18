import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { defaultQuestionnaire, type Questionnaire, type RespondentType } from "@/domain/evaluation/Pieces";
import type { Role } from "@/domain/users/User";
import { getAdminDb } from "@/lib/firebase/admin";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

// ── settings/pieces ─────────────────────────────────────────────────────────

/** Iisang document na `settings/pieces`: ang PIECES questionnaire at kung bukas ito. */
export class QuestionnaireRepository {
  private get ref() {
    return getAdminDb().collection("settings").doc("pieces");
  }

  /** Ang naka-save na questionnaire, o ang default kapag wala pa. */
  async get(): Promise<Questionnaire> {
    const data = (await this.ref.get()).data() as Partial<Questionnaire> | undefined;
    const fallback = defaultQuestionnaire();
    if (!data?.criteria?.length) return { ...fallback, isOpen: data?.isOpen ?? fallback.isOpen };
    return { isOpen: Boolean(data.isOpen), instructions: data.instructions ?? fallback.instructions, criteria: data.criteria };
  }

  async save(questionnaire: Questionnaire): Promise<void> {
    await this.ref.set({ ...questionnaire, updatedAt: toTimestamp(new Date()) });
  }
}

// ── piecesResponses/{uid} ───────────────────────────────────────────────────

/** Isang sagot bawat user; ang document ID ay ang UID, kaya hindi puwedeng dumoble. */
export type PiecesResponse = {
  uid: string;
  role: Role;
  respondentType: RespondentType;
  answers: Record<string, number>;
  comment: string;
  submittedAt: Date;
  updatedAt: Date;
};
type PiecesResponseDocument = Omit<PiecesResponse, "uid" | "submittedAt" | "updatedAt"> & { submittedAt: Timestamp; updatedAt: Timestamp };

export class PiecesResponseRepository extends BaseRepository<PiecesResponse, PiecesResponseDocument> {
  protected readonly collectionName = "piecesResponses";

  async save(response: PiecesResponse): Promise<void> {
    await this.create(response, response.uid);
  }

  /** Binubura ang lahat ng sagot; ibinabalik kung ilan. */
  async deleteAll(): Promise<number> {
    const refs = await this.collection.listDocuments();
    const db = getAdminDb();
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    return refs.length;
  }

  protected toEntity(id: string, data: PiecesResponseDocument): PiecesResponse {
    return { ...data, uid: id, comment: data.comment ?? "", submittedAt: toDate(data.submittedAt), updatedAt: toDate(data.updatedAt) };
  }

  protected toDocument({ uid: _uid, submittedAt, updatedAt, ...data }: PiecesResponse): PiecesResponseDocument {
    return { ...data, submittedAt: toTimestamp(submittedAt), updatedAt: toTimestamp(updatedAt) };
  }
}
