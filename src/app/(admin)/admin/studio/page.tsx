import { Suspense } from "react";
import type { Metadata } from "next";
import AVStudio from "@/components/studio/AVStudio";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ContentService } from "@/services/ContentService";
import { MediaService } from "@/services/MediaService";

export const metadata: Metadata = { title: "AV Studio & Recorder" };

/** AV Studio & Recorder (Fig. 9). */
export default function StudioPage() {
  return (
    <Suspense fallback={<PageLoading rows={5} />}>
      <StudioContent />
    </Suspense>
  );
}

async function StudioContent() {
  await requireUser(["admin"]);
  const mediaService = new MediaService();
  const [media, lessons, usage] = await Promise.all([
    mediaService.list(),
    new ContentService().listLessons(),
    mediaService.usage().catch((error) => {
      console.error("[studio:usage]", error);
      return null;
    }),
  ]);
  return (
    <AVStudio
      media={media}
      usage={usage}
      lessons={lessons.map((lesson) => {
        const props = lesson.toProps();
        return { id: lesson.id, label: `${lesson.chapterLabel} · ${lesson.title}`, hasVideo: Boolean(props.videoFile), hasAudio: Boolean(props.audioFile) };
      })}
    />
  );
}
