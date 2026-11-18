"use client";

import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import LockOutlined from "@mui/icons-material/LockOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import MiniChip from "@/components/ui/MiniChip";
import type { Board } from "@/services/ProgressService";
import { statusStyles } from "@/theme/status";
import { monoFont } from "@/theme/tokens";

const COLUMNS = "56px 80px minmax(180px,1.4fr) minmax(160px,1.2fr) 90px 90px 140px";

/** Syllabus Progress Board (Fig. 15): color-coded at read-only. */
export default function SyllabusBoard({ board, locked, preview }: { board: Board; locked: boolean; preview: boolean }) {
  const legend = (["not_started", "in_progress", "completed"] as const).map((key) => statusStyles[key]);
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <MenuBookOutlined sx={{ color: "text.secondary" }} />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Computer Programming 1</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Syllabus Progress Board · {board.total} modules</Typography>
        </Box>
        {legend.map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12, color: "text.secondary" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color }} /> {item.label}
          </Box>
        ))}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 180 }}>
          <LinearProgress variant="determinate" value={board.percent} sx={{ flex: 1, height: 6, borderRadius: 3 }} aria-label="Course progress" />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {board.completed}/{board.total}
          </Typography>
        </Box>
      </Box>

      {locked && <Alert severity="warning">That lesson is still locked. Pass the quiz of the previous lesson to unlock it.</Alert>}
      {preview && <Alert severity="info">Preview: this is how the board looks to a new student. As an educator you can open every lesson.</Alert>}

      <Card sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 860 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: COLUMNS, px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", fontSize: 11, fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em" }}>
            <span>#</span>
            <span>CHAPTER</span>
            <span>LESSON TITLE</span>
            <span>TOPIC</span>
            <span>MEDIA</span>
            <span>QUIZ</span>
            <span>STATUS</span>
          </Box>
          {board.rows.length === 0 && <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>No published lessons yet.</Typography>}
          {board.rows.map((row) => {
            const style = statusStyles[row.status];
            const isLocked = row.status === "locked" && !preview;
            const content = (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  alignItems: "center",
                  px: 2,
                  py: 1.25,
                  borderBottom: 1,
                  borderColor: "divider",
                  borderLeft: "3px solid",
                  borderLeftColor: style.color,
                  opacity: isLocked ? 0.6 : 1,
                  "&:hover": isLocked ? undefined : { bgcolor: "#F8FAFC" },
                }}
              >
                <Box sx={{ width: 24, height: 24, borderRadius: "6px", bgcolor: style.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{row.order}</Box>
                <Typography sx={{ fontFamily: monoFont, fontSize: 12, color: "text.secondary" }}>{row.chapterLabel}</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{row.title}</Typography>
                <Typography noWrap sx={{ fontFamily: monoFont, fontSize: 12, color: "text.secondary", pr: 1 }}>
                  {row.topics.join(", ")}
                </Typography>
                <span>{row.hasVideo ? <MiniChip label={row.mediaCode} color="#2563EB" bg="#DBEAFE" mono /> : <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>}</span>
                <span>{row.hasQuiz ? <MiniChip label={row.quizCode} color="#7C3AED" bg="#EDE9FE" mono /> : <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>}</span>
                <span>
                  <MiniChip label={style.label} color={style.color} bg={style.bg} icon={row.status === "locked" ? <LockOutlined /> : undefined} />
                  {row.bestQuizScore !== null && <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.25 }}>Best: {row.bestQuizScore}% (need {row.threshold}%)</Typography>}
                </span>
              </Box>
            );
            return isLocked ? (
              <Box key={row.lessonId} aria-disabled title="Locked">
                {content}
              </Box>
            ) : (
              <Box key={row.lessonId} component={NextLink} href={`/learn/${row.lessonId}`} sx={{ display: "block", color: "inherit" }} aria-label={`Open ${row.title}`}>
                {content}
              </Box>
            );
          })}
        </Box>
      </Card>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, fontSize: 12 }}>
        <Box component="span" sx={{ color: statusStyles.completed.color }}>{board.completed} completed</Box>
        <Box component="span" sx={{ color: statusStyles.in_progress.color }}>{board.inProgress} in progress</Box>
        <Box component="span" sx={{ color: "text.secondary" }}>{board.notStarted} not started</Box>
      </Box>
    </Box>
  );
}
