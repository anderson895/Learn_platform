"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import { checkSequenceAction } from "@/app/(workspace)/learn/actions";
import JavaCode from "@/components/content/JavaCode";
import type { ActivityDTO } from "@/domain/assessment/dto";

type Feedback = { correct: boolean | null; feedback: string; positions: boolean[] };

const blockSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  width: "100%",
  textAlign: "left" as const,
  px: 1.25,
  py: 0.9,
  mb: 0.75,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "8px",
  bgcolor: "background.paper",
  cursor: "pointer",
  fontSize: 12.5,
  "&:hover": { borderColor: "primary.main" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
};

/** Code Sequencing (Fig. 13): i-click ang block para ilagay sa "Your Sequence"; i-click ulit para ibalik. */
export default function CodeSequencing({ lessonId, activity, alreadySolved }: { lessonId: string; activity: ActivityDTO; alreadySolved: boolean }) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [result, setResult] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solved, setSolved] = useState(alreadySolved);
  const [isPending, startTransition] = useTransition();

  const byId = new Map(activity.blocks.map((block) => [block.id, block]));
  const available = activity.blocks.filter((block) => !sequence.includes(block.id));

  const place = (id: string) => {
    setSequence((current) => [...current, id]);
    setResult(null);
  };
  const remove = (id: string) => {
    setSequence((current) => current.filter((blockId) => blockId !== id));
    setResult(null);
  };

  const check = () =>
    startTransition(async () => {
      setError(null);
      const response = await checkSequenceAction(lessonId, activity.id, sequence);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setResult({ correct: response.data.correct, feedback: response.data.feedback, positions: response.data.positions });
      if (response.data.correct) setSolved(true);
    });

  return (
    <Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 600, mb: 1.5 }}>{activity.instructions || "Arrange the code blocks to form a valid Java program."}</Typography>
      {solved && !result && (
        <Alert severity="success" sx={{ mb: 1.5 }}>
          You already solved this activity. You can practice it again.
        </Alert>
      )}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", letterSpacing: "0.06em", mb: 1 }}>AVAILABLE ({available.length})</Typography>
          {available.map((block) => (
            <Box key={block.id} component="button" type="button" onClick={() => place(block.id)} sx={blockSx} aria-label={`Add block: ${block.code}`}>
              <DragIndicatorOutlined sx={{ fontSize: 14, color: "text.disabled" }} />
              <JavaCode code={block.code} />
            </Box>
          ))}
          {available.length === 0 && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>All blocks placed.</Typography>}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", letterSpacing: "0.06em", mb: 1 }}>YOUR SEQUENCE ({sequence.length})</Typography>
          <Box sx={{ minHeight: 64, border: "1px dashed", borderColor: "divider", borderRadius: "10px", p: 1 }}>
            {sequence.length === 0 && <Typography sx={{ fontSize: 12, color: "text.secondary", textAlign: "center", py: 1.5 }}>Click blocks to place them here</Typography>}
            {sequence.map((id, index) => {
              const state = result ? (result.positions[index] ? "ok" : "bad") : null;
              return (
                <Box
                  key={id}
                  component="button"
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Remove block ${index + 1}: ${byId.get(id)?.code}`}
                  sx={{
                    ...blockSx,
                    borderColor: state === "ok" ? "success.main" : state === "bad" ? "error.main" : "divider",
                    bgcolor: state === "ok" ? "#ECFDF5" : state === "bad" ? "#FEF2F2" : "background.paper",
                  }}
                >
                  <Typography component="span" sx={{ fontSize: 11, color: "text.secondary", width: 18 }}>
                    {index + 1}
                  </Typography>
                  <JavaCode code={byId.get(id)?.code ?? ""} />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
      {result && (
        <Alert severity={result.correct ? "success" : "warning"} sx={{ mt: 1.5 }}>
          {result.feedback}
        </Alert>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
        <Button variant="contained" disabled={sequence.length === 0 || isPending} onClick={check}>
          {isPending ? "Checking..." : "Check Sequence"}
        </Button>
        <Button color="inherit" disabled={sequence.length === 0 || isPending} onClick={() => { setSequence([]); setResult(null); }}>
          Reset
        </Button>
      </Box>
    </Box>
  );
}
