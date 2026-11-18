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

export { cloudinary };
