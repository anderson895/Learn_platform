import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Class Roster" };

export default function RosterPage() {
  return (
    <PagePlaceholder
      sprint={6}
      figure="Fig. 12"
      title="Class Roster"
      description="Progress ng bawat estudyante sa Computer Programming 1."
      items={["Table: Student, ID, progress bar at status (active/completed/inactive)", "Bilang ng enrolled", "Pag-click para makita ang detalye ng progress"]}
    />
  );
}
