import "server-only";
import type { MediaFile } from "@/domain/content/Lesson";
import type { MediaDTO, MediaKind } from "@/domain/content/Media";
import { deleteVideoResource, getUsage, getVideoResource, MEDIA_FOLDER, signUpload, type CloudinaryUsage, type SignedUpload } from "@/lib/cloudinary";
import { LessonRepository } from "@/repositories/LessonRepository";
import { MediaRepository, type MediaEntity } from "@/repositories/MediaRepository";
import { ContentService } from "./ContentService";

const toDTO = ({ createdAt, ...rest }: MediaEntity): MediaDTO => ({ ...rest, createdAt: createdAt.toISOString() });
const toMediaFile = (media: MediaEntity): MediaFile => ({
  publicId: media.publicId,
  secureUrl: media.secureUrl,
  format: media.format,
  bytes: media.bytes,
  duration: media.duration,
  originalFilename: media.originalFilename,
});
const lessonField = (kind: MediaKind) => (kind === "video" ? "videoFile" : "audioFile");

/** AV Studio & Recorder (Fig. 9): pag-upload sa Cloudinary at pag-attach ng media sa lesson. */
export class MediaService {
  constructor(
    private readonly media = new MediaRepository(),
    private readonly lessons = new LessonRepository(),
    private readonly content = new ContentService(),
  ) {}

  /** Pirma para sa direct upload mula sa browser. Hindi umaalis sa server ang API secret. */
  signUpload(): SignedUpload {
    return signUpload(MEDIA_FOLDER);
  }

  async list(): Promise<MediaDTO[]> {
    return (await this.media.listRecent()).map(toDTO);
  }

  usage(): Promise<CloudinaryUsage> {
    return getUsage();
  }

  /**
   * Itinatala ang na-upload na file. Kinukumpirma muna sa Cloudinary na umiiral ito,
   * kaya hindi maaaring magpasok ng ibang URL ang browser.
   */
  async register(
    input: { publicId: string; kind: MediaKind; originalFilename: string; lessonId: string | null; durationHint?: number | null },
    actorUid: string,
  ): Promise<MediaDTO> {
    const resource = await getVideoResource(input.publicId);
    const entity: MediaEntity = {
      id: "",
      publicId: resource.public_id,
      secureUrl: resource.secure_url,
      format: resource.format,
      bytes: resource.bytes,
      // Ang mga recording ng browser (webm) ay madalas walang duration, kaya ginagamit ang haba mula sa recorder.
      duration: resource.duration ?? input.durationHint ?? null,
      originalFilename: input.originalFilename || resource.original_filename || resource.public_id.split("/").pop() || "media",
      kind: input.kind,
      lessonId: null,
      uploadedBy: actorUid,
      createdAt: new Date(),
    };
    const id = await this.media.create(entity);
    const saved = { ...entity, id };
    if (input.lessonId) return this.attach(id, input.lessonId, actorUid);
    return toDTO(saved);
  }

  /** Ikinakabit ang media sa lesson (Publish to Syllabus). Papalitan nito ang dating video/audio ng lesson. */
  async attach(mediaId: string, lessonId: string, actorUid: string): Promise<MediaDTO> {
    const media = await this.media.findById(mediaId);
    if (!media) throw new Error("Media not found.");
    const lesson = await this.lessons.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found.");
    await this.content.setLessonMedia(lessonId, lessonField(media.kind), toMediaFile(media), actorUid);
    await this.media.update(mediaId, { lessonId });
    return toDTO({ ...media, lessonId });
  }

  async detach(mediaId: string, actorUid: string) {
    const media = await this.media.findById(mediaId);
    if (!media?.lessonId) return;
    const lesson = await this.lessons.findById(media.lessonId);
    const current = lesson?.toProps()[lessonField(media.kind)];
    if (lesson && current?.publicId === media.publicId) await this.content.setLessonMedia(lesson.id, lessonField(media.kind), null, actorUid);
    await this.media.update(mediaId, { lessonId: null });
  }

  /** Binubura sa Cloudinary at sa talaan, at inaalis sa lesson kung naka-attach. */
  async remove(mediaId: string, actorUid: string) {
    const media = await this.media.findById(mediaId);
    if (!media) return;
    await this.detach(mediaId, actorUid);
    await deleteVideoResource(media.publicId);
    await this.media.delete(mediaId);
  }
}
