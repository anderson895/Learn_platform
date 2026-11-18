import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

// ── settings/system ─────────────────────────────────────────────────────────

export type SystemSettings = { defaultThreshold: number };
export const DEFAULT_SETTINGS: SystemSettings = { defaultThreshold: 75 };

/** Iisang document na `settings/system`. */
export class SettingsRepository {
  private get ref() {
    return getAdminDb().collection("settings").doc("system");
  }

  async get(): Promise<SystemSettings> {
    const data = (await this.ref.get()).data() as Partial<SystemSettings> | undefined;
    return { ...DEFAULT_SETTINGS, ...data };
  }

  async save(settings: SystemSettings): Promise<void> {
    await this.ref.set({ ...settings, updatedAt: toTimestamp(new Date()) }, { merge: true });
  }
}

// ── announcements/{id} ──────────────────────────────────────────────────────

export type Announcement = { id: string; title: string; body: string; createdBy: string; createdAt: Date };
type AnnouncementDocument = Omit<Announcement, "id" | "createdAt"> & { createdAt: Timestamp };

/** System announcements (Admin Input, p. 37 ng PDF). */
export class AnnouncementRepository extends BaseRepository<Announcement, AnnouncementDocument> {
  protected readonly collectionName = "announcements";

  async listRecent(): Promise<Announcement[]> {
    return (await this.findAll()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  protected toEntity(id: string, data: AnnouncementDocument): Announcement {
    return { id, ...data, createdAt: toDate(data.createdAt) };
  }

  protected toDocument({ id: _id, createdAt, ...data }: Announcement): AnnouncementDocument {
    return { ...data, createdAt: toTimestamp(createdAt) };
  }
}
