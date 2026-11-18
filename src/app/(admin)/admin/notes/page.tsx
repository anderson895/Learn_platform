import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Notes Repository" };

export default function NotesPage() {
  return (
    <PagePlaceholder
      sprint={2}
      figure="Fig. 10"
      title="Notes Repository"
      description="Lecture Script Editor para sa lesson content."
      items={[
        "Markdown editor na may Save (draft) at Publish",
        "Saved Notes list na may published/draft na status",
        "Code Snippets (Java)",
        "Pag-link ng note sa isang lesson",
      ]}
    />
  );
}
