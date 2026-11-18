import "server-only";
import { AccountRepository } from "@/repositories/AccountRepository";
import { AuditLogRepository, type AuditLogEntry } from "@/repositories/AuditLogRepository";
import { AnnouncementRepository, SettingsRepository, type SystemSettings } from "@/repositories/SystemRepositories";

export type AnnouncementDTO = { id: string; title: string; body: string; createdAt: string };
export type AuditLogDTO = { id: string; user: string; action: AuditLogEntry["action"]; target: string; timestamp: string };

/** System Management (Fig. 5): settings, announcements at audit logs. */
export class SystemService {
  constructor(
    private readonly settings = new SettingsRepository(),
    private readonly announcements = new AnnouncementRepository(),
    private readonly logs = new AuditLogRepository(),
    private readonly accounts = new AccountRepository(),
  ) {}

  getSettings(): Promise<SystemSettings> {
    return this.settings.get();
  }

  async saveSettings(settings: SystemSettings, actorUid: string) {
    await this.settings.save(settings);
    await this.log(actorUid, "update", "settings/system");
  }

  async listAnnouncements(): Promise<AnnouncementDTO[]> {
    return (await this.announcements.listRecent()).map(({ id, title, body, createdAt }) => ({ id, title, body, createdAt: createdAt.toISOString() }));
  }

  /** Bilang ng announcements sa nakaraang 7 araw (para sa badge ng notifications). */
  async recentAnnouncementCount(days = 7): Promise<number> {
    const since = Date.now() - days * 86_400_000;
    return (await this.announcements.findAll()).filter((item) => item.createdAt.getTime() >= since).length;
  }

  async createAnnouncement(input: { title: string; body: string }, actorUid: string) {
    const id = await this.announcements.create({ id: "", ...input, createdBy: actorUid, createdAt: new Date() });
    await this.log(actorUid, "publish", `announcements/${id}`);
  }

  async deleteAnnouncement(id: string, actorUid: string) {
    await this.announcements.delete(id);
    await this.log(actorUid, "delete", `announcements/${id}`);
  }

  /** User Activity Logging (Control, p. 40): pinakabagong mga entry. */
  async recentLogs(limit = 100): Promise<AuditLogDTO[]> {
    const [logs, accounts] = await Promise.all([this.logs.listRecent(limit), this.accounts.findAll()]);
    const names = new Map(accounts.map((account) => [account.id, account.username]));
    return logs.map((log) => ({
      id: log.id,
      user: names.get(log.uid) ?? "(deleted user)",
      action: log.action,
      target: log.target,
      timestamp: log.timestamp.toISOString(),
    }));
  }

  private async log(uid: string, action: AuditLogEntry["action"], target: string) {
    await this.logs.create({ uid, action, target, timestamp: new Date() }).catch((error) => console.error("[audit]", error));
  }
}
