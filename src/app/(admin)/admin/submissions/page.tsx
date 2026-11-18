import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Submissions" };

export default function SubmissionsPage() {
  return (
    <PagePlaceholder
      sprint={4}
      title="Submissions & Grading"
      description="Mano-manong pag-grade ng Coding Exercises/Assignments (walang automatic grading ng code)."
      items={["Listahan ng mga submission na naghihintay ng grade", "Pagtingin ng isinulat na Java code", "Paglagay ng score at feedback"]}
    />
  );
}
