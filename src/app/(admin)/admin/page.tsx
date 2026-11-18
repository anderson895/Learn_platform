import { Suspense } from "react";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import AssignmentTurnedInOutlined from "@mui/icons-material/AssignmentTurnedInOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import LinkCard from "@/components/ui/LinkCard";
import PageLoading from "@/components/ui/PageLoading";
import { site } from "@/config/site";
import { getViewer, requireUser } from "@/lib/auth/session";
import { DashboardService } from "@/services/DashboardService";

export const metadata: Metadata = { title: "Dashboard" };

/** Admin Dashboard (Fig. 8). */
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageLoading rows={3} />}>
      <DashboardContent />
    </Suspense>
  );
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

async function DashboardContent() {
  const admin = await requireUser(["admin"]);
  const [viewer, stats] = await Promise.all([getViewer(admin), new DashboardService().overview()]);

  const cards = [
    { label: "MODULES RECORDED", value: `${stats.lessonsWithVideo} / ${stats.totalLessons}`, icon: <VideocamOutlined fontSize="small" />, color: "#0EA5E9", bg: "#E0F2FE" },
    { label: "PUBLISHED NOTES", value: String(stats.publishedNotes), icon: <DescriptionOutlined fontSize="small" />, color: "#10B981", bg: "#D1FAE5" },
    { label: "ENROLLED STUDENTS", value: String(stats.activeStudents), icon: <PeopleOutlined fontSize="small" />, color: "#F59E0B", bg: "#FEF3C7" },
    { label: "QUIZZES CREATED", value: `${stats.lessonsWithQuiz} / ${stats.totalLessons}`, icon: <MenuBookOutlined fontSize="small" />, color: "#8B5CF6", bg: "#EDE9FE" },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontSize: 20 }}>
        {greeting()}, {viewer.displayName} 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Here&apos;s your course overview for {site.course}.
      </Typography>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        {cards.map((stat) => (
          <Card key={stat.label} sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography variant="overline" sx={{ fontSize: 10.5, color: "text.secondary", lineHeight: 1 }}>
                {stat.label}
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "8px", display: "grid", placeItems: "center", color: stat.color, bgcolor: stat.bg }}>{stat.icon}</Box>
            </Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</Typography>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "grid", gap: 2, mt: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" } }}>
        <LinkCard
          href="/admin/studio"
          title="Go to AV Studio"
          subtitle={stats.nextToRecord ? `Record ${stats.nextToRecord}` : "All lessons have a video"}
          icon={<VideocamOutlined fontSize="small" color="primary" />}
        />
        <LinkCard
          href="/admin/notes"
          title="Open Notes Repository"
          subtitle={stats.nextToWrite ? `Draft lecture script for ${stats.nextToWrite}` : "All lessons have notes"}
          icon={<DescriptionOutlined fontSize="small" color="success" />}
        />
        <LinkCard
          href="/admin/submissions"
          title="Grade Submissions"
          subtitle={stats.pendingSubmissions ? `${stats.pendingSubmissions} coding exercise${stats.pendingSubmissions === 1 ? "" : "s"} waiting` : "Nothing to grade"}
          icon={<AssignmentTurnedInOutlined fontSize="small" color="warning" />}
        />
      </Box>
    </Box>
  );
}
