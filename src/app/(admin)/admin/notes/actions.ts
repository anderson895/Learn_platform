"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { noteSchema, snippetSchema } from "@/lib/validation/content";
import { fieldErrorsOf } from "@/lib/validation/student";
import { ContentService } from "@/services/ContentService";

export type NoteActionResult = { ok: boolean; id?: string; message?: string; fieldErrors?: Record<string, string> };

export async function saveNoteAction(
  id: string | null,
  input: { title: string; markdown: string; lessonId: string; status: "draft" | "published" },
): Promise<NoteActionResult> {
  const admin = await requireUser(["admin"]);
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error), message: "Please fix the highlighted fields." };
  try {
    const noteId = await new ContentService().saveNote(id, parsed.data, admin.id);
    refresh();
    return { ok: true, id: noteId };
  } catch (error) {
    console.error("[notes:save]", error);
    return { ok: false, message: "Something went wrong while saving. Please try again." };
  }
}

export async function deleteNoteAction(id: string): Promise<NoteActionResult> {
  const admin = await requireUser(["admin"]);
  try {
    await new ContentService().deleteNote(id, admin.id);
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[notes:delete]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function saveSnippetAction(input: { filename: string; code: string }): Promise<NoteActionResult> {
  const admin = await requireUser(["admin"]);
  const parsed = snippetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    const id = await new ContentService().saveSnippet(parsed.data, admin.id);
    refresh();
    return { ok: true, id };
  } catch (error) {
    console.error("[snippets:save]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function deleteSnippetAction(id: string): Promise<NoteActionResult> {
  const admin = await requireUser(["admin"]);
  try {
    await new ContentService().deleteSnippet(id, admin.id);
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[snippets:delete]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
