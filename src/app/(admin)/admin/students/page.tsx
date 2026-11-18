import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Student Accounts" };

export default function StudentsPage() {
  return (
    <PagePlaceholder
      sprint={1}
      title="Student Accounts"
      description="Manage Student Accounts at Account Status Management."
      items={["Listahan at paghahanap ng student", "Gumawa, mag-edit at mag-deactivate/activate ng account", "Mag-reset ng password (Firebase Auth)"]}
    />
  );
}
