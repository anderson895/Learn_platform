"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import type { AssessmentReportRow, PerformanceReport, ProgressReportRow, ReportType } from "@/services/ReportService";

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

function scoreColor(score: number | null, threshold: number) {
  if (score === null) return "text.disabled";
  return score >= threshold ? "success.main" : "error.main";
}

function SimpleTable({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#F8FAFC", "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" } }}>
            {head.map((label) => (
              <TableCell key={label}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((cells, index) => (
            <TableRow key={index} hover>
              {cells.map((cell, cellIndex) => (
                <TableCell key={cellIndex} sx={{ fontSize: 13 }}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={head.length} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** Report Management (Fig. 5): Student Progress, Assessment at Performance Reports, na may CSV at Print/PDF. */
export default function ReportsView({
  progress,
  assessments,
  performance,
  generatedAt,
}: {
  generatedAt: string;
  progress: ProgressReportRow[];
  assessments: AssessmentReportRow[];
  performance: PerformanceReport;
}) {
  const [tab, setTab] = useState<ReportType>("progress");
  const titles: Record<ReportType, string> = { progress: "Student Progress Report", assessments: "Assessment Report", performance: "Performance Report" };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Card className="no-print" sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", pr: 2 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ flex: 1, px: 1, "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}>
          <Tab value="progress" label="Student Progress" />
          <Tab value="assessments" label="Assessments" />
          <Tab value="performance" label="Performance" />
        </Tabs>
        <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} href={`/api/reports/${tab}`}>
          Download CSV
        </Button>
        <Button size="small" variant="outlined" color="inherit" startIcon={<PrintOutlined />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </Card>

      <Card>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{titles[tab]}</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Computer Programming 1 · generated {generatedAt}
          </Typography>
        </Box>
        {tab === "progress" && (
          <SimpleTable
            head={["STUDENT NO.", "NAME", "COURSE", "YEAR", "COMPLETED", "PROGRESS", "AVG. QUIZ", "STATUS"]}
            empty="No students yet."
            rows={progress.map((r) => [r.studentNumber, r.name, r.course, r.yearLevel, `${r.completed}/${r.total}`, `${r.percent}%`, pct(r.averageQuizScore), r.status])}
          />
        )}
        {tab === "assessments" && (
          <SimpleTable
            head={["LESSON", "QUIZ", "ITEMS", "PASSING", "ATTEMPTS", "STUDENTS", "AVG. SCORE", "PASS RATE", "CODING (GRADED)", "AVG. CODING"]}
            empty="No quiz attempts or coding submissions yet."
            rows={assessments.map((r) => [
              r.lesson,
              r.quizTitle,
              r.items || "—",
              `${r.threshold}%`,
              r.attempts,
              r.studentsAttempted,
              pct(r.averageScore),
              pct(r.passRate),
              `${r.codingSubmitted} (${r.codingGraded})`,
              pct(r.averageCodingPercent),
            ])}
          />
        )}
        {tab === "performance" && (
          <SimpleTable
            head={["STUDENT NO.", "NAME", ...performance.lessons.map((lesson) => `${lesson.label.toUpperCase()} BEST`)]}
            empty="No published lessons with quizzes yet."
            rows={performance.rows.map((r) => [
              r.studentNumber,
              r.name,
              ...r.scores.map((score, index) => (
                <Box key={index} component="span" sx={{ fontWeight: 600, color: scoreColor(score, performance.lessons[index].threshold) }}>
                  {pct(score)}
                </Box>
              )),
            ])}
          />
        )}
      </Card>
      {tab === "performance" && performance.lessons.length > 0 && (
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Green: met the lesson&apos;s passing score. Red: below it. —: no attempt yet.</Typography>
      )}
    </Box>
  );
}
