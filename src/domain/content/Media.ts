import type { MediaFile } from "./Lesson";

export type MediaKind = "video" | "audio";

/** Isang file sa Cloudinary na in-upload mula sa AV Studio (Fig. 9). */
export interface MediaProps extends MediaFile {
  kind: MediaKind;
  lessonId: string | null;
  uploadedBy: string;
  createdAt: Date;
}

export type MediaDTO = Omit<MediaProps, "createdAt"> & { id: string; createdAt: string };

/** Pinapalitan ang Cloudinary URL para awtomatikong piliin ang pinakamagaang format at quality para sa browser. */
export function deliveryUrl(secureUrl: string): string {
  return secureUrl.includes("/upload/") ? secureUrl.replace("/upload/", "/upload/f_auto,q_auto/") : secureUrl;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
