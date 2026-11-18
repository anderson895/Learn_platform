import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return (
    <PagePlaceholder
      sprint={7}
      title="Announcements"
      description="Mga system announcement mula sa admin."
      items={["Listahan ng announcements, pinakabago muna", "Notification sa bell icon"]}
    />
  );
}
