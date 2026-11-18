/**
 * Direct (signed) upload mula sa browser papuntang Cloudinary.
 * Ang malalaking file ay hinahati sa 20 MB na chunk (Cloudinary chunked upload), may progress.
 * Walang secret dito: ang pirma ay galing sa server (`getUploadSignatureAction`).
 */

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadPreset?: string;
};

export type UploadedAsset = { public_id: string; secure_url: string; bytes: number; duration?: number; format: string };

const CHUNK_SIZE = 20 * 1024 * 1024;

function sendPart(url: string, body: FormData, headers: Record<string, string>, onProgress: (loaded: number) => void): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      let response: (UploadedAsset & { error?: { message?: string } }) | null = null;
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        /* walang JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && response) resolve(response);
      else reject(new Error(response?.error?.message ?? `Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.send(body);
  });
}

export async function uploadToCloudinary(
  file: Blob,
  filename: string,
  signature: UploadSignature,
  onProgress: (fraction: number) => void,
): Promise<UploadedAsset> {
  const url = `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`;
  const form = (part: Blob) => {
    const data = new FormData();
    data.append("file", part, filename);
    data.append("api_key", signature.apiKey);
    data.append("timestamp", String(signature.timestamp));
    data.append("signature", signature.signature);
    data.append("folder", signature.folder);
    if (signature.uploadPreset) data.append("upload_preset", signature.uploadPreset);
    return data;
  };

  if (file.size <= CHUNK_SIZE) {
    return sendPart(url, form(file), {}, (loaded) => onProgress(Math.min(1, loaded / file.size)));
  }

  const uploadId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let result: UploadedAsset | null = null;
  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    result = await sendPart(
      url,
      form(file.slice(start, end)),
      { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
      (loaded) => onProgress(Math.min(1, (start + loaded) / file.size)),
    );
  }
  return result!;
}
