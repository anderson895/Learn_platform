import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Syllabus Board" };

export default function SyllabusBoardPage() {
  return (
    <PagePlaceholder
      sprint={6}
      figure="Fig. 15"
      title="Syllabus Progress Board"
      description="Color-coded na progress sa bawat chapter (read-only para sa student)."
      items={[
        "Table: #, Chapter, Lesson Title, Topic, Media, Quiz, Status",
        "Mga kulay: Not Started (gray), In Progress (amber), Completed (green), Locked",
        "Overall progress bar (hal. 2/10)",
        "Pag-click sa lesson → Student Workspace (Fig. 13, Sprint 4)",
      ]}
    />
  );
}
