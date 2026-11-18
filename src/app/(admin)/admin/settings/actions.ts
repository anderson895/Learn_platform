"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { MaintenanceService } from "@/services/MaintenanceService";
import { StorageService } from "@/services/StorageService";
import { SystemService } from "@/services/SystemService";

export type SettingsResult<T = null> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> };

async function run<T>(label: string, task: () => Promise<T>): Promise<SettingsResult<T>> {
  try {
    const data = await task();
    refresh();
    return { ok: true, data };
  } catch (error) {
    console.error(`[settings:${label}]`, error);
    return { ok: false, message: (error as Error).message || "Something went wrong. Please try again." };
  }
}

const assetsSchema = z
  .array(z.object({ publicId: z.string().min(1).max(300), resourceType: z.enum(["video", "image", "raw"]) }))
  .min(1, "Select at least one file.")
  .max(500);

export async function deleteStorageAssetsAction(items: unknown): Promise<SettingsResult<number>> {
  const admin = await requireUser(["admin"]);
  const parsed = assetsSchema.safeParse(items);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid selection." };
  return run("storage-delete", () => new StorageService().deleteAssets(parsed.data, admin.id));
}

export async function resetStudentDataAction(target: string) {
  const admin = await requireUser(["admin"]);
  return run("reset", () => new MaintenanceService().resetStudentData(target, admin.id));
}

export async function deleteStudentAccountAction(uid: string) {
  const admin = await requireUser(["admin"]);
  if (!uid || uid === "all") return { ok: false as const, message: "Select one student." };
  return run("delete-student", () => new MaintenanceService().deleteStudentAccount(uid, admin.id).then(() => null));
}

export async function clearAuditLogsAction() {
  const admin = await requireUser(["admin"]);
  return run("clear-logs", () => new MaintenanceService().clearAuditLogs(admin.id));
}

const settingsSchema = z.object({
  defaultThreshold: z.coerce.number().int("Use a whole number.").min(0, "Use 0 to 100.").max(100, "Use 0 to 100."),
});

export async function saveSettingsAction(input: unknown): Promise<SettingsResult> {
  const admin = await requireUser(["admin"]);
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted field.", fieldErrors: { defaultThreshold: parsed.error.issues[0]?.message ?? "Invalid." } };
  return run("settings", () => new SystemService().saveSettings(parsed.data, admin.id).then(() => null));
}

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Use at most 120 characters."),
  body: z.string().trim().min(1, "Message is required.").max(3000, "Use at most 3,000 characters."),
});

export async function createAnnouncementAction(input: unknown): Promise<SettingsResult> {
  const admin = await requireUser(["admin"]);
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }
  return run("announce", () => new SystemService().createAnnouncement(parsed.data, admin.id).then(() => null));
}

export async function deleteAnnouncementAction(id: string): Promise<SettingsResult> {
  const admin = await requireUser(["admin"]);
  return run("announce-delete", () => new SystemService().deleteAnnouncement(id, admin.id).then(() => null));
}
