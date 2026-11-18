"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ChevronRight from "@mui/icons-material/ChevronRight";
import GraphicEqOutlined from "@mui/icons-material/GraphicEqOutlined";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import QuizOutlined from "@mui/icons-material/QuizOutlined";
import { markLessonDoneAction, openLessonAction } from "@/app/(workspace)/learn/actions";
import BrandLogo from "@/components/brand/BrandLogo";
import Markdown from "@/components/content/Markdown";
import MiniChip from "@/components/ui/MiniChip";
import type { ExerciseSubmissionDTO, LessonAssessments } from "@/domain/assessment/dto";
import { statusStyles, type LessonStatus } from "@/theme/status";
import { brand, monoFont } from "@/theme/tokens";
import CodeSequencing from "./CodeSequencing";
import CodingExercisePanel from "./CodingExercisePanel";

export type WorkspaceLesson = {
  id: string;
  order: number;
  chapterLabel: string;
  title: string;
  topics: string[];
  instructorName: string;
  summary: string;
  videoUrl: string | null;
  audioUrl: string | null;
};

type Props = {
  lesson: WorkspaceLesson;
  notes: string | null;
  assessments: LessonAssessments;
  exerciseSubmissions: Record<string, ExerciseSubmissionDTO>;
  progress: { status: LessonStatus | null; activitiesDone: string[]; reviewed: boolean; bestQuizScore: number | null };
  viewerName: string;
  hasQuiz: boolean;
  threshold: number;
  preview: boolean;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IN";

/** Student Workspace (Fig. 13): split screen ng lesson video at mga interactive exercise. */
export default function WorkspaceView({ lesson, notes, assessments, exerciseSubmissions, progress, viewerName, hasQuiz, threshold, preview }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const defaultTab = assessments.activities.length ? "activities" : assessments.exercises.length ? "coding" : "notes";
  const [tab, setTab] = useState<"activities" | "coding" | "notes">(defaultTab);
  const [activityIndex, setActivityIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [doneMessage, setDoneMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    openLessonAction(lesson.id).catch(() => undefined);
  }, [lesson.id]);

  const pad = String(lesson.order).padStart(2, "0");
  const activity = assessments.activities[activityIndex];
  const exercise = assessments.exercises[exerciseIndex];
  const status = progress.status;
  const statusStyle = status ? statusStyles[status] : null;

  const play = () => {
    setPlaying(true);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => undefined));
  };

  const markDone = () =>
    startTransition(async () => {
      const result = await markLessonDoneAction(lesson.id);
      setDoneMessage(result.ok ? { severity: "success", text: "Lesson completed! The next lesson is now unlocked." } : { severity: "error", text: result.message });
    });

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      {/* ── Kaliwa: video ─────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: brand.navy, color: "#fff", display: "flex", flexDirection: "column", minHeight: { xs: "auto", md: "100vh" }, position: { md: "sticky" }, top: 0, height: { md: "100vh" } }}>
        <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, borderBottom: `1px solid ${brand.navyBorder}` }}>
          <BrandLogo />
          <Box sx={{ flex: 1 }} />
          <Button component={NextLink} href="/learn" size="small" endIcon={<ChevronRight />} sx={{ color: "#CBD5E1" }}>
            Syllabus Board
          </Button>
        </Box>

        <Box sx={{ flex: 1, position: "relative", display: "grid", placeItems: "center", minHeight: { xs: 260, md: 0 }, background: "radial-gradient(circle at 50% 40%, #14304F 0%, #0F1B2D 65%)" }}>
          {lesson.videoUrl && (
            <Box
              component="video"
              ref={videoRef}
              src={lesson.videoUrl}
              controls={playing}
              preload="metadata"
              playsInline
              onPlay={() => setPlaying(true)}
              sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", bgcolor: "#000", visibility: playing ? "visible" : "hidden" }}
            />
          )}
          {!playing && (
            <Box sx={{ position: "relative", textAlign: "center", px: 3 }}>
              <Typography sx={{ fontFamily: monoFont, fontSize: 12, letterSpacing: "0.2em", color: "#64748B" }}>CP1 · LESSON {pad}</Typography>
              <Typography sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 700, mt: 0.5 }}>{lesson.title}</Typography>
              {lesson.topics.length > 0 && <Typography sx={{ fontSize: 13, color: "#94A3B8", mt: 0.5 }}>{lesson.topics.join(" · ")}</Typography>}
              {lesson.videoUrl ? (
                <IconButton onClick={play} aria-label="Play lesson video" sx={{ mt: 2.5, width: 56, height: 56, border: "1px solid #334155", color: "#E2E8F0", bgcolor: "rgba(14,165,233,0.12)", "&:hover": { bgcolor: "rgba(14,165,233,0.25)" } }}>
                  <PlayArrowRounded fontSize="large" />
                </IconButton>
              ) : (
                <Typography sx={{ fontSize: 13, color: "#64748B", mt: 2.5 }}>No video for this lesson yet. Read the notes on the right.</Typography>
              )}
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, mt: 2.5, px: 1.5, py: 0.75, borderRadius: "8px", bgcolor: "rgba(15,23,42,0.6)", border: "1px solid #1E2B40", textAlign: "left" }}>
                <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "primary.main", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{initials(lesson.instructorName)}</Box>
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{lesson.instructorName || "Instructor"}</Typography>
                  <Typography sx={{ fontSize: 11, color: "#64748B" }}>Instructor · CP1</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {lesson.audioUrl && (
          <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${brand.navyBorder}`, display: "flex", alignItems: "center", gap: 1.5 }}>
            <GraphicEqOutlined sx={{ color: "primary.main" }} />
            <Typography sx={{ fontSize: 12.5, color: "#CBD5E1", whiteSpace: "nowrap" }}>Audio lesson</Typography>
            <Box component="audio" src={lesson.audioUrl} controls preload="none" sx={{ flex: 1, height: 36, minWidth: 0 }} />
          </Box>
        )}
      </Box>

      {/* ── Kanan: mga exercise ──────────────────────────────────────── */}
      <Box sx={{ bgcolor: "background.default", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", px: 2.5, pt: 1.5 }}>
          {preview && (
            <Alert severity="info" sx={{ mb: 1, py: 0 }}>
              Preview mode — you are viewing this lesson as a student. Progress is not recorded.
            </Alert>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MiniChip label={lesson.chapterLabel} color="#0369A1" bg="#E0F2FE" mono />
                {statusStyle && <MiniChip label={statusStyle.label} color={statusStyle.color} bg={statusStyle.bg} />}
                {progress.bestQuizScore !== null && <MiniChip label={`Best quiz: ${progress.bestQuizScore}%`} color="#7C3AED" bg="#EDE9FE" />}
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 0.5 }}>{lesson.title}</Typography>
            </Box>
            {assessments.reviewer && assessments.reviewer.questions.length > 0 && (
              <Button component={NextLink} href={`/learn/${lesson.id}/review`} size="small" variant="outlined" startIcon={<QuizOutlined />}>
                Syntax Reviewer{progress.reviewed ? " ✓" : ""}
              </Button>
            )}
            {hasQuiz && (
              <Button component={NextLink} href={`/learn/${lesson.id}/quiz`} size="small" variant="contained" color="secondary" endIcon={<ArrowForwardRounded />}>
                Take Quiz
              </Button>
            )}
          </Box>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 1, minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 } }}>
            <Tab value="activities" label={`Activities (${assessments.activities.length})`} />
            <Tab value="coding" label={`Coding (${assessments.exercises.length})`} />
            <Tab value="notes" label="Notes" />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, p: 2.5, overflowY: "auto" }}>
          {tab === "activities" &&
            (activity ? (
              <Box>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                  {assessments.activities.map((item, index) => (
                    <Chip
                      key={item.id}
                      size="small"
                      clickable
                      onClick={() => setActivityIndex(index)}
                      color={index === activityIndex ? "primary" : "default"}
                      variant={index === activityIndex ? "filled" : "outlined"}
                      label={`Exercise ${lesson.order}.${index + 1}${progress.activitiesDone.includes(item.id) ? " ✓" : ""}`}
                    />
                  ))}
                  <Typography sx={{ fontSize: 12, color: "text.secondary", alignSelf: "center" }}>Code Sequencing · {activity.title}</Typography>
                </Box>
                <CodeSequencing key={activity.id} lessonId={lesson.id} activity={activity} alreadySolved={progress.activitiesDone.includes(activity.id)} />
              </Box>
            ) : (
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>No activities for this lesson yet.</Typography>
            ))}

          {tab === "coding" &&
            (exercise ? (
              <Box>
                {assessments.exercises.length > 1 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                    {assessments.exercises.map((item, index) => (
                      <Chip key={item.id} size="small" clickable onClick={() => setExerciseIndex(index)} color={index === exerciseIndex ? "primary" : "default"} variant={index === exerciseIndex ? "filled" : "outlined"} label={item.title} />
                    ))}
                  </Box>
                )}
                <CodingExercisePanel key={exercise.id} lessonId={lesson.id} exercise={exercise} submission={exerciseSubmissions[exercise.id]} preview={preview} />
              </Box>
            ) : (
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>No coding exercises for this lesson yet.</Typography>
            ))}

          {tab === "notes" && (
            <Box sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "12px", p: 2.5 }}>
              {lesson.summary && <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 2 }}>{lesson.summary}</Typography>}
              {notes ? <Markdown>{notes}</Markdown> : <Typography sx={{ color: "text.secondary", fontSize: 14 }}>No notes have been published for this lesson yet.</Typography>}
            </Box>
          )}
        </Box>

        <Box sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper", px: 2.5, py: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary", flex: 1 }}>
            Logged in as <strong>{viewerName}</strong>
          </Typography>
          {doneMessage && <Alert severity={doneMessage.severity} sx={{ py: 0 }}>{doneMessage.text}</Alert>}
          {!preview && !hasQuiz && status !== "completed" && !doneMessage && (
            <Button size="small" variant="outlined" color="success" disabled={isPending} onClick={markDone}>
              {isPending ? "Saving..." : "Mark lesson as done"}
            </Button>
          )}
          {hasQuiz && status !== "completed" && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Score at least {threshold}% on the quiz to unlock the next lesson.</Typography>}
          <Button component={NextLink} href="/learn" size="small" endIcon={<ArrowForwardRounded />}>
            View Progress
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
