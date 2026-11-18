import { Suspense } from "react";
import type { Metadata } from "next";
import NotesRepository from "@/components/notes/NotesRepository";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ContentService } from "@/services/ContentService";

export const metadata: Metadata = { title: "Notes Repository" };

/** Notes Repository (Fig. 10). */
export default function NotesPage() {
  return (
    <Suspense fallback={<PageLoading rows={6} />}>
      <NotesContent />
    </Suspense>
  );
}

async function NotesContent() {
  await requireUser(["admin"]);
  const content = new ContentService();
  const [notes, lessons, snippets] = await Promise.all([content.listNotes(), content.listLessons(), content.listSnippets()]);
  return (
    <NotesRepository
      notes={notes.map((note) => note.toDTO())}
      lessons={lessons.map((lesson) => ({ id: lesson.id, label: `${lesson.chapterLabel} · ${lesson.title}` }))}
      snippets={snippets.map(({ id, filename, code }) => ({ id, filename, code }))}
    />
  );
}
