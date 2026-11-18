import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PagePlaceholder
      sprint={7}
      title="Settings & System Maintenance"
      description="System Management (Fig. 5) at Objective 2.9."
      items={["Default passing threshold at academic year", "Announcements", "Audit logs (user activity logging)", "Backup: JSON export ng database"]}
    />
  );
}
