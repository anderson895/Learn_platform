"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import { startQuizAction, submitQuizAction } from "@/app/(workspace)/learn/actions";
import JavaCode from "@/components/content/JavaCode";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import type { QuizDTO, QuizOutcome } from "@/domain/assessment/dto";
import { brand, monoFont } from "@/theme/tokens";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

type Phase = { name: "intro" } | { name: "taking"; attemptId: string | null; deadline: number | null } | { name: "result"; outcome: QuizOutcome };

/** Summative Quiz: ang score ang batayan ng Accomplishment Threshold (Objective 2.6). */
export default function QuizView({
  lesson,
  quiz,
  threshold,
  bestScore,
  attempts,
  preview,
  completed,
}: {
  lesson: { id: string; chapterLabel: string; title: string };
  quiz: QuizDTO;
  threshold: number;
  bestScore: number | null;
  attempts: number;
  preview: boolean;
  completed: boolean;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submittedRef = useRef(false);

  const answered = quiz.questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== null).length;

  const start = () =>
    startTransition(async () => {
      setError(null);
      const result = await startQuizAction(lesson.id, quiz.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      submittedRef.current = false;
      setAnswers({});
      setNow(Date.now());
      setPhase({ name: "taking", attemptId: result.data.attemptId, deadline: result.data.deadline });
    });

  const submit = useCallback(() => {
    if (phase.name !== "taking" || submittedRef.current) return;
    submittedRef.current = true;
    setConfirming(false);
    startTransition(async () => {
      const result = await submitQuizAction(lesson.id, quiz.id, phase.attemptId, answers);
      if (result.ok) {
        setPhase({ name: "result", outcome: result.data });
        window.scrollTo({ top: 0 });
      } else {
        submittedRef.current = false;
        setError(result.message);
      }
    });
  }, [answers, lesson.id, phase, quiz.id]);

  // Countdown; kusang ipapasa kapag naubos ang oras.
  useEffect(() => {
    if (phase.name !== "taking" || !phase.deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [phase]);
  const remaining = phase.name === "taking" && phase.deadline ? phase.deadline - now : null;
  useEffect(() => {
    if (remaining !== null && remaining <= 0) submit();
  }, [remaining, submit]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", px: { xs: 1.5, md: 3 }, py: 1, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Button component={NextLink} href={`/learn/${lesson.id}`} size="small" startIcon={<ArrowBackRounded />} color="inherit" sx={{ color: "text.secondary" }}>
          Back to lesson
        </Button>
        <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
          {lesson.chapterLabel} · {quiz.title}
        </Typography>
        {phase.name === "taking" && (
          <>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {answered}/{quiz.questions.length} answered
            </Typography>
            {remaining !== null && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.5, borderRadius: "8px", fontFamily: monoFont, fontWeight: 700, fontSize: 14, bgcolor: remaining < 60_000 ? "#FEE2E2" : "#F1F5F9", color: remaining < 60_000 ? "error.main" : "text.primary" }} role="timer" aria-live="off">
                <TimerOutlined sx={{ fontSize: 17 }} /> {clock(remaining)}
              </Box>
            )}
            <Button variant="contained" color="secondary" size="small" disabled={isPending} onClick={() => (answered < quiz.questions.length ? setConfirming(true) : submit())}>
              {isPending ? "Submitting..." : "Submit Quiz"}
            </Button>
          </>
        )}
      </Box>

      <Box sx={{ maxWidth: 760, mx: "auto", p: { xs: 2, md: 3 }, display: "grid", gap: 2 }}>
        {preview && <Alert severity="info">Preview mode — your answers are checked but not recorded.</Alert>}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {phase.name === "intro" && (
          <Card sx={{ p: 3 }}>
            <MiniChip label="Summative assessment" color="#B45309" bg="#FEF3C7" />
            <Typography variant="h5" sx={{ mt: 1 }}>
              {quiz.title}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 2 }}>
              {lesson.chapterLabel} · {lesson.title}
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, fontSize: 14, "& li": { mb: 0.5 } }}>
              <li>{quiz.questions.length} multiple-choice questions</li>
              <li>{quiz.timeLimit ? `Time limit: ${quiz.timeLimit} minutes (submits automatically when time runs out)` : "No time limit"}</li>
              <li>
                Passing score: <strong>{threshold}%</strong> — passing completes this lesson and unlocks the next one
              </li>
              <li>You can retake the quiz; your best score is kept</li>
            </Box>
            {(bestScore !== null || attempts > 0) && (
              <Alert severity={completed ? "success" : "info"} sx={{ my: 2 }}>
                Best score: <strong>{bestScore ?? 0}%</strong> after {attempts} attempt{attempts === 1 ? "" : "s"}.{completed ? " This lesson is completed." : ""}
              </Alert>
            )}
            <Button variant="contained" color="secondary" size="large" onClick={start} disabled={isPending} sx={{ mt: 1 }}>
              {isPending ? "Starting..." : attempts > 0 ? "Retake Quiz" : "Start Quiz"}
            </Button>
          </Card>
        )}

        {phase.name === "taking" &&
          quiz.questions.map((question, index) => (
            <Card key={question.id} sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: brand.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{index + 1}</Box>
                <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{question.prompt}</Typography>
              </Box>
              {question.code && (
                <Box sx={{ bgcolor: brand.navy, borderRadius: "10px", p: 1.5, mb: 1.5, overflowX: "auto", fontSize: 13 }}>
                  <JavaCode code={question.code} dark />
                </Box>
              )}
              <Box role="radiogroup" aria-label={`Question ${index + 1}`} sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                {question.choices.map((choice, choiceIndex) => {
                  const selected = answers[question.id] === choiceIndex;
                  return (
                    <Box
                      key={choiceIndex}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: choiceIndex }))}
                      sx={{ display: "flex", alignItems: "center", gap: 1, textAlign: "left", p: 1.25, border: "1px solid", borderRadius: "10px", cursor: "pointer", fontSize: 13, borderColor: selected ? "primary.main" : "divider", bgcolor: selected ? "#F0F9FF" : "#F8FAFC" }}
                    >
                      <Box component="span" sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: selected ? "primary.main" : "#E2E8F0", color: selected ? "#fff" : "inherit", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {LETTERS[choiceIndex]}
                      </Box>
                      <JavaCode code={choice} />
                    </Box>
                  );
                })}
              </Box>
            </Card>
          ))}

        {phase.name === "result" && (
          <>
            <Card sx={{ p: 3, textAlign: "center" }}>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Your score</Typography>
              <Typography sx={{ fontSize: 52, fontWeight: 800, color: phase.outcome.passed ? "success.main" : "error.main", lineHeight: 1.1 }}>{phase.outcome.score}%</Typography>
              <Typography sx={{ fontSize: 14 }}>
                {phase.outcome.correctCount} of {phase.outcome.total} correct · passing score {phase.outcome.threshold}%
              </Typography>
              <Box sx={{ mt: 2 }}>
                {phase.outcome.passed ? <MiniChip label="PASSED" color="#059669" bg="#D1FAE5" /> : <MiniChip label="BELOW PASSING SCORE" color="#DC2626" bg="#FEE2E2" />}
              </Box>
              {phase.outcome.newlyCompleted && (
                <Alert severity="success" sx={{ mt: 2, textAlign: "left" }}>
                  Lesson completed! The next lesson is now unlocked.
                </Alert>
              )}
              {!phase.outcome.passed && !phase.outcome.preview && (
                <Alert severity="warning" sx={{ mt: 2, textAlign: "left" }}>
                  You need at least {phase.outcome.threshold}% to unlock the next lesson. Review the lesson and try again. Best score so far: {phase.outcome.best}%.
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2.5, flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={start} disabled={isPending}>
                  Retake Quiz
                </Button>
                <Button component={NextLink} href={`/learn/${lesson.id}`} variant="outlined" color="inherit">
                  Back to lesson
                </Button>
                <Button component={NextLink} href="/learn" variant="contained">
                  View Progress
                </Button>
              </Box>
            </Card>
            <Typography sx={{ fontWeight: 600, mt: 1 }}>Quiz feedback</Typography>
            {quiz.questions.map((question, index) => {
              const result = phase.outcome.results.find((item) => item.questionId === question.id);
              return (
                <Card key={question.id} sx={{ p: 2, borderLeft: "4px solid", borderLeftColor: result?.correct ? "success.main" : "error.main" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                    {index + 1}. {question.prompt}
                  </Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    Your answer:{" "}
                    <Box component="span" sx={{ color: result?.correct ? "success.main" : "error.main", fontWeight: 600 }}>
                      {result?.chosen === null || result?.chosen === undefined ? "No answer" : `${LETTERS[result.chosen]}. ${question.choices[result.chosen]}`}
                    </Box>
                  </Typography>
                  {!result?.correct && result && result.correctIndex >= 0 && (
                    <Typography sx={{ fontSize: 13 }}>
                      Correct answer:{" "}
                      <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>
                        {LETTERS[result.correctIndex]}. {question.choices[result.correctIndex]}
                      </Box>
                    </Typography>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </Box>

      <ConfirmDialog
        open={confirming}
        title="Submit quiz?"
        message={`You answered ${answered} of ${quiz.questions.length} questions. Unanswered questions are marked wrong.`}
        confirmLabel="Submit"
        onClose={() => setConfirming(false)}
        onConfirm={submit}
      />
    </Box>
  );
}
