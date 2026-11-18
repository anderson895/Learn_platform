import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { MediaProps } from "@/domain/content/Media";
import { BaseRepository } from "./BaseRepository";
import { toDate, toTimestamp } from "./firestore";

export type MediaEntity = MediaProps & { id: string };
type MediaDocument = Omit<MediaProps, "createdAt"> & { createdAt: Timestamp };

/** `media/{id}`: talaan ng mga file sa Cloudinary. */
export class MediaRepository extends BaseRepository<MediaEntity, MediaDocument> {
  protected readonly collectionName = "media";

  async listRecent(): Promise<MediaEntity[]> {
    return (await this.findAll()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  protected toEntity(id: string, data: MediaDocument): MediaEntity {
    return { id, ...data, lessonId: data.lessonId ?? null, createdAt: toDate(data.createdAt) };
  }

  protected toDocument({ id: _id, ...data }: MediaEntity): MediaDocument {
    return { ...data, createdAt: toTimestamp(data.createdAt) };
  }
}
