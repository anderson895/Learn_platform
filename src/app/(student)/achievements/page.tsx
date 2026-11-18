import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Achievements" };

export default function AchievementsPage() {
  return (
    <PagePlaceholder
      sprint={6}
      title="Achievements"
      description="Achievement badges (Output ng PDF, p. 38)."
      items={["Unang lesson na natapos", "Perfect quiz score", "Natapos ang buong kurso"]}
    />
  );
}
