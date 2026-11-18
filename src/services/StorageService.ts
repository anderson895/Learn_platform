import "server-only";
import { deleteAssets, getUsageDetail, listAllAssets, type CloudinaryAsset, type CloudinaryResourceType, type CloudinaryUsageDetail } from "@/lib/cloudinary";
import { AuditLogRepository } from "@/repositories/AuditLogRepository";
import { MediaRepository } from "@/repositories/MediaRepository";
import { ContentService } from "./ContentService";
import { MediaService } from "./MediaService";

/** Mga default na file ng bagong Cloudinary account (`samples/...`, `cld-sample`, `main-sample`, `sample`). */
const SAMPLE_ID = /^(samples\/|cld-sample(-\d+)?$|main-sample$|sample$)/;

export type StorageAssetDTO = CloudinaryAsset & {
  /** Lesson na gumagamit ng file, o `null` kung walang gumagamit. */
  usedBy: string | null;
  /** Nasa talaan ng AV Studio (Firestore `media`). */
  inLibrary: boolean;
  /** Sample na file na kasama ng bagong Cloudinary account. */
  isSample: boolean;
};

export type StorageOverview = {
  usage: CloudinaryUsageDetail | null;
  usageError: string | null;
  assets: StorageAssetDTO[];
  totals: { count: number; bytes: number; unusedCount: number; unusedBytes: number };
};

/**
 * Pagbabantay sa Cloudinary free tier (Settings): usage, listahan ng lahat ng file,
 * at pagbura para magkaroon ulit ng espasyo habang nagte-test.
 */
export class StorageService {
  constructor(
    private readonly media = new MediaRepository(),
    private readonly content = new ContentService(),
    private readonly mediaService = new MediaService(),
    private readonly logs = new AuditLogRepository(),
  ) {}

  async overview(): Promise<StorageOverview> {
    const [usageResult, assets, media, lessons] = await Promise.all([
      getUsageDetail().then(
        (usage) => ({ usage, error: null }),
        (error: Error) => ({ usage: null, error: error.message || "Could not read Cloudinary usage." }),
      ),
      listAllAssets(),
      this.media.findAll(),
      this.content.listLessons(),
    ]);

    const usedBy = new Map<string, string>();
    for (const lesson of lessons) {
      const props = lesson.toProps();
      for (const file of [props.videoFile, props.audioFile]) if (file) usedBy.set(file.publicId, `${lesson.chapterLabel} · ${lesson.title}`);
    }
    const inLibrary = new Set(media.map((item) => item.publicId));

    const rows = assets.map((asset) => ({
      ...asset,
      usedBy: usedBy.get(asset.publicId) ?? null,
      inLibrary: inLibrary.has(asset.publicId),
      isSample: SAMPLE_ID.test(asset.publicId) || asset.folder === "samples",
    }));
    const unused = rows.filter((row) => !row.usedBy);
    return {
      usage: usageResult.usage,
      usageError: usageResult.error,
      assets: rows,
      totals: {
        count: rows.length,
        bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
        unusedCount: unused.length,
        unusedBytes: unused.reduce((sum, row) => sum + row.bytes, 0),
      },
    };
  }

  /**
   * Binubura ang mga napiling file sa Cloudinary. Kung nasa AV Studio library o naka-attach sa lesson,
   * inaalis din ito roon para walang sirang link.
   */
  async deleteAssets(items: { publicId: string; resourceType: CloudinaryResourceType }[], actorUid: string): Promise<number> {
    let deleted = 0;
    const lessons = await this.content.listLessons();
    const direct = new Map<CloudinaryResourceType, string[]>();

    for (const item of items) {
      const tracked = await this.media.findOneWhere("publicId", item.publicId);
      if (tracked) {
        await this.mediaService.remove(tracked.id, actorUid);
        deleted += 1;
        continue;
      }
      for (const lesson of lessons) {
        const props = lesson.toProps();
        if (props.videoFile?.publicId === item.publicId) await this.content.setLessonMedia(lesson.id, "videoFile", null, actorUid);
        if (props.audioFile?.publicId === item.publicId) await this.content.setLessonMedia(lesson.id, "audioFile", null, actorUid);
      }
      direct.set(item.resourceType, [...(direct.get(item.resourceType) ?? []), item.publicId]);
    }
    for (const [resourceType, publicIds] of direct) deleted += await deleteAssets(resourceType, publicIds);

    await this.logs
      .create({ uid: actorUid, action: "delete", target: `cloudinary:${items.length} file(s)`, timestamp: new Date() })
      .catch((error) => console.error("[audit]", error));
    return deleted;
  }
}
