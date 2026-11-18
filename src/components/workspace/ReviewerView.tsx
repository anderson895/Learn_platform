"use client";

import { useState, useTransition } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import { finishReviewerAction, revealAnswerAction } from "@/app/(workspace)/learn/actions";
import JavaCode from "@/components/content/JavaCode";
import type { QuizDTO } from "@/domain/assessment/dto";
import { brand } from "@/theme/tokens";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Syntax Reviewer (Fig. 14): formative na multiple-choice practice. */
export default function ReviewerView({
  lesson,
  reviewer,
  viewerName,
  alreadyReviewed,
}: {
  lesson: { id: string; chapterLabel: string; title: string };
  reviewer: QuizDTO;
  viewerName: string;
  alreadyReviewed: boolean;
}) {
  const questions = reviewer.questions;
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(alreadyReviewed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const question = questions[index];
  const correctIndex = revealed[question.id];

  const reveal = () =>
    startTransition(async () => {
      const result = await revealAnswerAction(lesson.id, reviewer.id, question.id);
      if (result.ok) setRevealed((current) => ({ ...current, [question.id]: result.data }));
      else setError(result.message);
    });

  const markReviewed = () => {
    const next = new Set(reviewed).add(question.id);
    setReviewed(next);
    if (next.size === questions.length && !finished) {
      startTransition(async () => {
        const result = await finishReviewerAction(lesson.id, reviewer.id);
        if (result.ok) setFinished(true);
        else setError(result.message);
      });
    } else if (index < questions.length - 1) {
      setIndex(index + 1);
    }
  };

  const choiceStyle = (choiceIndex: number) => {
    const isChosen = chosen[question.id] === choiceIndex;
    if (correctIndex !== undefined) {
      if (choiceIndex === correctIndex) return { borderColor: "success.main", bgcolor: "#ECFDF5" };
      if (isChosen) return { borderColor: "error.main", bgcolor: "#FEF2F2" };
    }
    return isChosen ? { borderColor: "primary.main", bgcolor: "#F0F9FF" } : { borderColor: "divider", bgcolor: "#F8FAFC" };
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Box sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", px: { xs: 1.5, md: 3 }, py: 1, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Button component={NextLink} href="/learn" size="small" startIcon={<ArrowBackRounded />} color="inherit" sx={{ color: "text.secondary" }}>
          Syllabus Board
        </Button>
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {questions.map((item, itemIndex) => (
            <Box
              key={item.id}
              component="button"
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`Question ${itemIndex + 1}`}
              aria-current={itemIndex === index ? "step" : undefined}
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                borderColor: itemIndex === index ? brand.ink : reviewed.has(item.id) ? "success.main" : "divider",
                bgcolor: itemIndex === index ? brand.ink : reviewed.has(item.id) ? "#D1FAE5" : "#F1F5F9",
                color: itemIndex === index ? "#fff" : "text.secondary",
              }}
            >
              {itemIndex + 1}
            </Box>
          ))}
          <Typography sx={{ fontSize: 13, fontWeight: 600, ml: 1 }}>
            Question {index + 1} of {questions.length}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>· {reviewed.size} reviewed</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "primary.main" }}>{viewerName.charAt(0).toUpperCase()}</Avatar>
          <Typography sx={{ fontSize: 13, display: { xs: "none", sm: "block" } }}>{viewerName}</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "grid", placeItems: "center", p: 2 }}>
        <Card sx={{ width: "100%", maxWidth: 560, boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: brand.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{index + 1}</Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary" }}>
                {lesson.chapterLabel.toUpperCase()} · {lesson.title.toUpperCase()}
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{question.prompt}</Typography>
            </Box>
            <Button component={NextLink} href={`/learn/${lesson.id}`} size="small" startIcon={<MenuBookOutlined />} sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
              Back to lesson
            </Button>
          </Box>
          <Box sx={{ p: 2 }}>
            {question.code && (
              <Box sx={{ bgcolor: brand.navy, borderRadius: "10px", p: 1.75, mb: 2, overflowX: "auto", fontSize: 13 }}>
                <JavaCode code={question.code} dark />
              </Box>
            )}
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", mb: 1 }}>SELECT YOUR ANSWER:</Typography>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {question.choices.map((choice, choiceIndex) => (
                <Box
                  key={choiceIndex}
                  component="button"
                  type="button"
                  onClick={() => setChosen((current) => ({ ...current, [question.id]: choiceIndex }))}
                  aria-pressed={chosen[question.id] === choiceIndex}
                  sx={{ display: "flex", alignItems: "center", gap: 1, textAlign: "left", p: 1.25, border: "1px solid", borderRadius: "10px", cursor: "pointer", fontSize: 13, ...choiceStyle(choiceIndex) }}
                >
                  <Box component="span" sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "#E2E8F0", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {LETTERS[choiceIndex]}
                  </Box>
                  <JavaCode code={choice} />
                </Box>
              ))}
            </Box>
            {correctIndex !== undefined && (
              <Alert severity={chosen[question.id] === correctIndex ? "success" : "info"} sx={{ mt: 2 }}>
                {chosen[question.id] === undefined
                  ? `The correct answer is ${LETTERS[correctIndex]}.`
                  : chosen[question.id] === correctIndex
                    ? "Correct!"
                    : `Not quite. The correct answer is ${LETTERS[correctIndex]}.`}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {finished && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Reviewer completed. You can keep practicing, or go back to the lesson and take the quiz.
              </Alert>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "#FBFCFE", flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" color="inherit" startIcon={<ChevronLeft />} disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Previous
            </Button>
            <Button size="small" variant="outlined" color="inherit" endIcon={<ChevronRight />} disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>
              Next
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" color="inherit" startIcon={<VisibilityOutlined />} disabled={isPending || correctIndex !== undefined} onClick={reveal}>
              Reveal Answer
            </Button>
            <Button size="small" variant="contained" color="success" startIcon={<CheckRounded />} disabled={isPending || reviewed.has(question.id)} onClick={markReviewed}>
              {reviewed.has(question.id) ? "Reviewed" : "Mark as Reviewed"}
            </Button>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
