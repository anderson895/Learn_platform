import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PagePlaceholder
      sprint={1}
      title="Profile"
      description="Manage Profile (Fig. 5)."
      items={["Pangalan, course at year level", "Pagpalit ng password", "Ang role at status ay hindi mababago ng user"]}
    />
  );
}
