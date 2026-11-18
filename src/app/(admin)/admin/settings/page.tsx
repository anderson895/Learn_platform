import { Suspense } from "react";
import type { Metadata } from "next";
import SettingsView from "@/components/settings/SettingsView";
import { SETTINGS_TABS, type SettingsTab } from "@/components/settings/tabs";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { StorageService } from "@/services/StorageService";
import { StudentAccountService } from "@/services/StudentAccountService";
import { SystemService } from "@/services/SystemService";

export const metadata: Metadata = { title: "Settings" };

type Props = { searchParams: Promise<{ tab?: string }> };

/** Settings & System Maintenance (Fig. 5 at Objective 2.9). */
export default function SettingsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageLoading rows={5} />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SettingsContent({ searchParams }: Props) {
  await requireUser(["admin"]);
  const system = new SystemService();
  const [{ tab }, storage, students, announcements, logs, settings] = await Promise.all([
    searchParams,
    new StorageService().overview().catch((error) => {
      console.error("[settings:storage]", error);
      return null;
    }),
    new StudentAccountService().list(),
    system.listAnnouncements(),
    system.recentLogs(100),
    system.getSettings(),
  ]);
  const initialTab = SETTINGS_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : "storage";
  return (
    <SettingsView
      initialTab={initialTab}
      storage={storage}
      students={students.map((student) => ({ uid: student.uid, label: `${student.fullName} (${student.studentNumber})` }))}
      announcements={announcements}
      logs={logs}
      defaultThreshold={settings.defaultThreshold}
    />
  );
}
