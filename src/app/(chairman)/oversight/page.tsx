import { Suspense } from "react";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ReportsView from "@/components/reports/ReportsView";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ReportService } from "@/services/ReportService";

export const metadata: Metadata = { title: "Oversight" };

/** Chairman Oversight Module (Fig. 6): read-only na buod at mga report. */
export default function OversightPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OversightContent />
    </Suspense>
  );
}

async function OversightContent() {
  await requireUser(["chairman", "admin"]);
  const reports = new ReportService();
  const [progress, assessments, performance] = await Promise.all([reports.studentProgress(), reports.assessments(), reports.performance()]);
  const active = progress.filter((row) => row.status !== "inactive");
  const avg = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
  const quizScores = active.map((row) => row.averageQuizScore).filter((score): score is number => score !== null);
  const cards = [
    { label: "ACTIVE STUDENTS", value: String(active.length) },
    { label: "AVG. COURSE PROGRESS", value: active.length ? `${avg(active.map((row) => row.percent))}%` : "—" },
    { label: "AVG. QUIZ SCORE", value: quizScores.length ? `${avg(quizScores)}%` : "—" },
    { label: "COMPLETED THE COURSE", value: String(progress.filter((row) => row.status === "completed").length) },
  ];

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontSize: 20 }}>
          Chairman Oversight
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Read-only view of Computer Programming 1 class performance.
        </Typography>
      </Box>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        {cards.map((card) => (
          <Card key={card.label} sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ fontSize: 10.5, color: "text.secondary" }}>
              {card.label}
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{card.value}</Typography>
          </Card>
        ))}
      </Box>
      <ReportsView
        progress={progress}
        assessments={assessments}
        performance={performance}
        generatedAt={new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" })}
      />
    </Box>
  );
}
