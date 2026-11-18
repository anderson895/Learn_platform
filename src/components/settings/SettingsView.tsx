"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import type { StorageOverview } from "@/services/StorageService";
import type { AnnouncementDTO, AuditLogDTO } from "@/services/SystemService";
import { AnnouncementsPanel, AuditLogPanel, GeneralPanel, TestingPanel } from "./SettingsPanels";
import StoragePanel from "./StoragePanel";
import type { SettingsTab } from "./tabs";

/** Settings & System Maintenance (Objective 2.9). */
export default function SettingsView({
  initialTab,
  storage,
  students,
  announcements,
  logs,
  defaultThreshold,
}: {
  initialTab: SettingsTab;
  storage: StorageOverview | null;
  students: { uid: string; label: string }[];
  announcements: AnnouncementDTO[];
  logs: AuditLogDTO[];
  defaultThreshold: number;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontSize: 20 }}>
          Settings & System Maintenance
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Storage, test data cleanup, announcements, activity logs and backup.
        </Typography>
      </Box>
      <Card>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ px: 1, "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}>
          <Tab value="storage" label="Storage" />
          <Tab value="testing" label="Testing & Cleanup" />
          <Tab value="announcements" label={`Announcements (${announcements.length})`} />
          <Tab value="logs" label="Audit Logs" />
          <Tab value="general" label="General & Backup" />
        </Tabs>
      </Card>
      {tab === "storage" && <StoragePanel overview={storage} />}
      {tab === "testing" && <TestingPanel students={students} />}
      {tab === "announcements" && <AnnouncementsPanel announcements={announcements} />}
      {tab === "logs" && <AuditLogPanel logs={logs} />}
      {tab === "general" && <GeneralPanel defaultThreshold={defaultThreshold} />}
    </Box>
  );
}
