import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary, SERVER LANG.
 * Dito pinipirmahan (sign) ang upload, kaya nananatili sa server ang API secret.
 * Diretsong ia-upload ng browser ang file sa Cloudinary gamit ang signature na ito.
 */
function config() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Kulang ang Cloudinary credentials sa .env.local.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudName, apiKey, apiSecret };
}

export type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadPreset?: string;
};

/** Gumagawa ng signature para sa direct upload mula sa browser (gagamitin sa Sprint 3, AV Studio). */
export function signUpload(folder: string): SignedUpload {
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = Math.round(Date.now() / 1000);
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || undefined;
  const params: Record<string, string | number> = { folder, timestamp };
  if (uploadPreset) params.upload_preset = uploadPreset;
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return { cloudName, apiKey, timestamp, signature, folder, uploadPreset };
}

/** Folder ng mga lesson media sa Cloudinary. */
export const MEDIA_FOLDER = "learn-platform/lessons";

/** Tinitingnan kung umiiral ang video/audio sa Cloudinary at kinukuha ang detalye nito. */
export async function getVideoResource(publicId: string) {
  config();
  return (await cloudinary.api.resource(publicId, { resource_type: "video" })) as {
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
    duration?: number;
    original_filename?: string;
  };
}

export async function deleteVideoResource(publicId: string) {
  config();
  await cloudinary.uploader.destroy(publicId, { resource_type: "video", invalidate: true });
}

export type CloudinaryUsage = { plan: string; storageBytes: number; creditsUsed: number; creditsLimit: number; maxVideoBytes: number };

/** Detalyadong usage ng Cloudinary account (para sa Settings). Ang 1 credit ≈ 1 GB storage o 1 GB bandwidth o 1,000 transformations. */
export type CloudinaryUsageDetail = {
  plan: string;
  lastUpdated: string | null;
  credits: { used: number; limit: number; percent: number };
  storage: { bytes: number; credits: number };
  bandwidth: { bytes: number; credits: number };
  transformations: { count: number; credits: number };
  objects: number;
  maxVideoBytes: number;
  maxImageBytes: number;
};

type RawUsage = {
  plan?: string;
  last_updated?: string;
  credits?: { usage?: number; limit?: number; used_percent?: number };
  storage?: { usage?: number; credits_usage?: number };
  bandwidth?: { usage?: number; credits_usage?: number };
  transformations?: { usage?: number; credits_usage?: number };
  objects?: { usage?: number };
  resources?: number;
  media_limits?: { video_max_size_bytes?: number; image_max_size_bytes?: number };
};

export async function getUsageDetail(): Promise<CloudinaryUsageDetail> {
  config();
  const usage = (await cloudinary.api.usage()) as RawUsage;
  const used = usage.credits?.usage ?? 0;
  const limit = usage.credits?.limit ?? 0;
  return {
    plan: usage.plan ?? "",
    lastUpdated: usage.last_updated ?? null,
    credits: { used, limit, percent: usage.credits?.used_percent ?? (limit ? (used / limit) * 100 : 0) },
    storage: { bytes: usage.storage?.usage ?? 0, credits: usage.storage?.credits_usage ?? 0 },
    bandwidth: { bytes: usage.bandwidth?.usage ?? 0, credits: usage.bandwidth?.credits_usage ?? 0 },
    transformations: { count: usage.transformations?.usage ?? 0, credits: usage.transformations?.credits_usage ?? 0 },
    objects: usage.objects?.usage ?? usage.resources ?? 0,
    maxVideoBytes: usage.media_limits?.video_max_size_bytes ?? 100 * 1024 * 1024,
    maxImageBytes: usage.media_limits?.image_max_size_bytes ?? 10 * 1024 * 1024,
  };
}

export async function getUsage(): Promise<CloudinaryUsage> {
  const detail = await getUsageDetail();
  return {
    plan: detail.plan,
    storageBytes: detail.storage.bytes,
    creditsUsed: detail.credits.used,
    creditsLimit: detail.credits.limit,
    maxVideoBytes: detail.maxVideoBytes,
  };
}

export type CloudinaryResourceType = "video" | "image" | "raw";

export type CloudinaryAsset = {
  publicId: string;
  resourceType: CloudinaryResourceType;
  format: string;
  bytes: number;
  folder: string;
  createdAt: string;
  secureUrl: string;
};

/** Lahat ng file sa Cloudinary account (video, image at raw), pinakamalaki muna. */
export async function listAllAssets(): Promise<CloudinaryAsset[]> {
  config();
  const assets: CloudinaryAsset[] = [];
  for (const resourceType of ["video", "image", "raw"] as const) {
    let cursor: string | undefined;
    do {
      const page = (await cloudinary.api.resources({ resource_type: resourceType, type: "upload", max_results: 500, next_cursor: cursor })) as {
        resources: { public_id: string; format?: string; bytes: number; folder?: string; asset_folder?: string; created_at: string; secure_url: string }[];
        next_cursor?: string;
      };
      for (const item of page.resources) {
        assets.push({
          publicId: item.public_id,
          resourceType,
          format: item.format ?? "",
          bytes: item.bytes,
          folder: item.asset_folder ?? item.folder ?? "",
          createdAt: item.created_at,
          secureUrl: item.secure_url,
        });
      }
      cursor = page.next_cursor;
    } while (cursor && assets.length < 5000);
  }
  return assets.sort((a, b) => b.bytes - a.bytes);
}

/** Binubura ang maraming file nang sabay (hanggang 100 bawat tawag sa Cloudinary). */
export async function deleteAssets(resourceType: CloudinaryResourceType, publicIds: string[]): Promise<number> {
  config();
  let deleted = 0;
  for (let i = 0; i < publicIds.length; i += 100) {
    const result = (await cloudinary.api.delete_resources(publicIds.slice(i, i + 100), { resource_type: resourceType, type: "upload", invalidate: true })) as {
      deleted?: Record<string, string>;
    };
    deleted += Object.values(result.deleted ?? {}).filter((status) => status === "deleted").length;
  }
  return deleted;
}

export { cloudinary };
