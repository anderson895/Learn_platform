"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { MediaDTO } from "@/domain/content/Media";
import type { SignedUpload } from "@/lib/cloudinary";
import { requireUser } from "@/lib/auth/session";
import { MediaService } from "@/services/MediaService";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; message: string };

const fail = (label: string, error: unknown): { ok: false; message: string } => {
  console.error(`[studio:${label}]`, error);
  return { ok: false, message: "Something went wrong. Please try again." };
};

export async function getUploadSignatureAction(): Promise<Result<SignedUpload>> {
  await requireUser(["admin"]);
  try {
    return { ok: true, data: new MediaService().signUpload() };
  } catch (error) {
    return fail("sign", error);
  }
}

const registerSchema = z.object({
  publicId: z.string().min(1).max(300),
  kind: z.enum(["video", "audio"]),
  originalFilename: z.string().max(200),
  lessonId: z.string().max(100).nullable(),
  durationHint: z.number().nonnegative().max(60 * 60 * 6).nullable().optional(),
});

export async function registerMediaAction(input: z.infer<typeof registerSchema>): Promise<Result<MediaDTO>> {
  const admin = await requireUser(["admin"]);
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid upload details." };
  try {
    const media = await new MediaService().register(parsed.data, admin.id);
    refresh();
    return { ok: true, data: media };
  } catch (error) {
    return fail("register", error);
  }
}

export async function attachMediaAction(mediaId: string, lessonId: string): Promise<Result> {
  const admin = await requireUser(["admin"]);
  try {
    await new MediaService().attach(mediaId, lessonId, admin.id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail("attach", error);
  }
}

export async function detachMediaAction(mediaId: string): Promise<Result> {
  const admin = await requireUser(["admin"]);
  try {
    await new MediaService().detach(mediaId, admin.id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail("detach", error);
  }
}

export async function deleteMediaAction(mediaId: string): Promise<Result> {
  const admin = await requireUser(["admin"]);
  try {
    await new MediaService().remove(mediaId, admin.id);
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return fail("delete", error);
  }
}
