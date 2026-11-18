import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Syllabus Builder" };

export default function SyllabusBuilderPage() {
  return (
    <PagePlaceholder
      sprint={2}
      figure="Fig. 11"
      title="Syllabus Builder"
      description="Pag-ayos ng mga module/lesson ng Computer Programming 1."
      items={[
        "Subject at Syllabus (course description, objectives, learning outcomes)",
        "Add Module; pag-edit, pag-reorder (drag) at pag-delete",
        "Status chips: Video ready/No video, Notes/No notes",
        "Passing threshold ng bawat lesson",
      ]}
    />
  );
}
