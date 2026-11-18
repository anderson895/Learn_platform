import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Oversight" };

export default function OversightPage() {
  return (
    <PagePlaceholder
      sprint={7}
      figure="Fig. 6"
      title="Chairman Oversight"
      description="Read-only na pagtingin sa progress ng klase at sa mga report."
      items={["Buod ng class progress", "Pag-download ng Student Progress, Assessment at Performance Reports"]}
    />
  );
}
