"use client";

import { useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Radio from "@mui/material/Radio";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import { submitEvaluationAction } from "@/app/(student)/evaluation/actions";
import { LIKERT, type Questionnaire, type RespondentType } from "@/domain/evaluation/Pieces";
import type { MyEvaluationDTO } from "@/services/EvaluationService";

const COLUMNS = { xs: "1fr", md: "minmax(0, 1fr) 340px" };
const when = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

type Feedback = { severity: "success" | "error"; text: string } | null;

/** Ang PIECES questionnaire na sinasagutan ng students at faculty (5-point Likert scale). */
export default function EvaluationForm({
  questionnaire,
  initial,
  respondentType,
}: {
  questionnaire: Pick<Questionnaire, "instructions" | "criteria">;
  initial: MyEvaluationDTO;
  respondentType: RespondentType;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submittedAt, setSubmittedAt] = useState(initial?.updatedAt ?? null);
  const [isPending, startTransition] = useTransition();

  const itemIds = useMemo(() => questionnaire.criteria.flatMap((criterion) => criterion.items.map((item) => item.id)), [questionnaire]);
  /** Tuloy-tuloy na numero ng tanong (1 hanggang 30) sa lahat ng criterion. */
  const numberOf = useMemo(() => new Map(itemIds.map((id, index) => [id, index + 1])), [itemIds]);
  const answered = itemIds.filter((id) => answers[id] >= 1 && answers[id] <= 5).length;
  const percent = Math.round((answered / itemIds.length) * 100);

  const choose = (id: string, value: number) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setMissing((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const scrollTo = (id: string) => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const submit = () => {
    const left = itemIds.filter((id) => !(answers[id] >= 1 && answers[id] <= 5));
    if (left.length) {
      setMissing(new Set(left));
      setFeedback({ severity: "error", text: `Please answer all questions (${left.length} left). Unanswered questions are highlighted.` });
      scrollTo(left[0]);
      return;
    }
    startTransition(async () => {
      const result = await submitEvaluationAction({ answers, comment });
      if (result.ok) {
        setSubmittedAt(new Date().toISOString());
        setFeedback({ severity: "success", text: result.updated ? "Your answers were updated. Thank you!" : "Thank you! Your evaluation was submitted." });
      } else {
        if (result.missing?.length) {
          setMissing(new Set(result.missing));
          scrollTo(result.missing[0]);
        }
        setFeedback({ severity: "error", text: result.message });
      }
    });
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", display: "grid", gap: 2 }}>
      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1 }}>
          System Evaluation · PIECES
        </Typography>
        <Typography variant="h5" sx={{ fontSize: { xs: 19, md: 22 }, mb: 1 }}>
          Interactive E-Learning System for Computer Programming 1
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary", whiteSpace: "pre-wrap", mb: 2 }}>{questionnaire.instructions}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {LIKERT.map((option) => (
            <Box key={option.value} sx={{ px: 1.2, py: 0.5, borderRadius: "8px", bgcolor: "#F1F5F9", fontSize: 12.5 }}>
              <b>{option.value}</b> · {option.label}
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Answering as: <b>{respondentType === "student" ? "Student" : "Faculty"}</b>
        </Typography>
        {submittedAt && (
          <Alert icon={<CheckCircleOutlined />} severity="success" sx={{ mt: 2 }}>
            You submitted this evaluation on {when(submittedAt)}. You can still change your answers while the evaluation is open.
          </Alert>
        )}
      </Card>

      <Card sx={{ p: 2, position: "sticky", top: 72, zIndex: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
          {answered} of {itemIds.length} answered
        </Typography>
        <LinearProgress variant="determinate" value={percent} sx={{ flex: 1, height: 6, borderRadius: 3 }} aria-label="Questions answered" />
      </Card>

      {questionnaire.criteria.map((criterion) => (
        <Card key={criterion.key} component="section" aria-labelledby={`c-${criterion.key}`} sx={{ overflow: "hidden" }}>
          <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", borderBottom: "1px solid", borderColor: "divider", bgcolor: "#F8FAFC" }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "#E0F2FE", color: "primary.main", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>
              {criterion.name.charAt(0)}
            </Box>
            <Box>
              <Typography id={`c-${criterion.key}`} sx={{ fontWeight: 700 }}>
                {criterion.name}
              </Typography>
              {criterion.description && <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{criterion.description}</Typography>}
            </Box>
          </Box>
          <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: COLUMNS.md, px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>STATEMENT</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", textAlign: "center" }}>
              {LIKERT.map((option) => (
                <Typography key={option.value} sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary", lineHeight: 1.3 }}>
                  {option.short}
                  <br />({option.value})
                </Typography>
              ))}
            </Box>
          </Box>
          {criterion.items.map((item) => {
            const isMissing = missing.has(item.id);
            return (
              <Box
                key={item.id}
                id={`q-${item.id}`}
                role="radiogroup"
                aria-labelledby={`l-${item.id}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  alignItems: "center",
                  gap: { xs: 1, md: 0 },
                  px: 2,
                  py: 1.25,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-of-type": { borderBottom: 0 },
                  bgcolor: isMissing ? "#FEF2F2" : "transparent",
                  boxShadow: isMissing ? "inset 3px 0 0 #DC2626" : "none",
                  scrollMarginTop: 140,
                }}
              >
                <Typography id={`l-${item.id}`} sx={{ fontSize: 14, pr: { md: 2 } }}>
                  <Box component="span" sx={{ color: "text.secondary", fontWeight: 600, mr: 1 }}>
                    {numberOf.get(item.id)}.
                  </Box>
                  {item.text}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", textAlign: "center" }}>
                  {LIKERT.map((option) => (
                    <Box key={option.value} component="label" sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                      <Radio
                        size="small"
                        name={item.id}
                        value={option.value}
                        checked={answers[item.id] === option.value}
                        onChange={() => choose(item.id, option.value)}
                        slotProps={{ input: { "aria-label": `${option.value} - ${option.label}` } }}
                      />
                      <Typography component="span" sx={{ display: { md: "none" }, fontSize: 11, color: "text.secondary", mt: -0.5 }}>
                        {option.short}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Card>
      ))}

      <Card sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 2 }}>
        <TextField
          label="Comments and suggestions (optional)"
          multiline
          minRows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
          helperText={`${comment.length}/1000`}
        />
        {feedback && (
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
            {feedback.text}
          </Alert>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" size="large" onClick={submit} disabled={isPending}>
            {isPending ? "Submitting..." : submittedAt ? "Update my answers" : "Submit evaluation"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
