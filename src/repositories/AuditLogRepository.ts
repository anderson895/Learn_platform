import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { BaseRepository } from "./BaseRepository";

/** Isang entry ng User Activity Logging (Control, p. 40 ng PDF). */
export interface AuditLogEntry {
  uid: string;
  action: "register" | "login" | "logout" | "create" | "update" | "delete" | "publish";
  target: string;
  timestamp: Date;
}

export type AuditLogRecord = AuditLogEntry & { id: string };

interface AuditLogDocument {
  uid: string;
  action: AuditLogEntry["action"];
  target: string;
  timestamp: Timestamp;
}

export class AuditLogRepository extends BaseRepository<AuditLogEntry, AuditLogDocument> {
  protected readonly collectionName = "auditLogs";

  /** Pinakabagong mga log (gumagamit ng single-field index ng `timestamp`, na awtomatiko sa Firestore). */
  async listRecent(limit: number): Promise<AuditLogRecord[]> {
    const snap = await this.collection.orderBy("timestamp", "desc").limit(limit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...this.toEntity(doc.id, doc.data()) }));
  }

  protected toEntity(_id: string, data: AuditLogDocument): AuditLogEntry {
    return { ...data, timestamp: data.timestamp.toDate() };
  }

  protected toDocument(entry: AuditLogEntry): AuditLogDocument {
    return { ...entry, timestamp: Timestamp.fromDate(entry.timestamp) };
  }
}
