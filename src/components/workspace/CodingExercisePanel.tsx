"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { submitExerciseAction } from "@/app/(workspace)/learn/actions";
import CodeEditor from "@/components/content/CodeEditor";
import MiniChip from "@/components/ui/MiniChip";
import type { ExerciseDTO, ExerciseSubmissionDTO } from "@/domain/assessment/dto";

/** Coding Exercise / Assignment: isusulat ng student ang Java code at ipapasa sa instructor (walang compiler). */
export default function CodingExercisePanel({
  lessonId,
  exercise,
  submission,
  preview,
}: {
  lessonId: string;
  exercise: ExerciseDTO;
  submission: ExerciseSubmissionDTO | undefined;
  preview: boolean;
}) {
  const [code, setCode] = useState(submission?.code || exercise.starterCode);
  const [message, setMessage] = useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const graded = submission?.status === "graded";

  const submit = () =>
    startTransition(async () => {
      const result = await submitExerciseAction(lessonId, exercise.id, code);
      setMessage(
        result.ok
          ? { severity: result.data.preview ? "info" : "success", text: result.data.preview ? "Preview mode: submissions are not saved for educators." : result.data.feedback }
          : { severity: "error", text: result.message },
      );
    });

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{exercise.title}</Typography>
        <MiniChip label={exercise.language} color="#B45309" bg="#FEF3C7" />
        {submission && (graded ? <MiniChip label={`Graded: ${submission.score}/${submission.maxScore}`} color="#059669" bg="#D1FAE5" /> : <MiniChip label="Submitted · awaiting grade" color="#0369A1" bg="#E0F2FE" />)}
      </Box>
      <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap", mb: 1.5 }}>{exercise.instructions}</Typography>
      {graded && submission?.feedback && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          <strong>Instructor feedback:</strong> {submission.feedback}
        </Alert>
      )}
      <CodeEditor label={`Your code for ${exercise.title}`} value={code} onChange={setCode} minRows={14} dark />
      {message && (
        <Alert severity={message.severity} sx={{ mt: 1.5 }}>
          {message.text}
        </Alert>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 1.5, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="contained" disabled={isPending} onClick={submit}>
          {isPending ? "Submitting..." : submission && !graded ? "Resubmit" : "Submit to instructor"}
        </Button>
        <Button color="inherit" disabled={isPending} onClick={() => setCode(exercise.starterCode)}>
          Reset to starter code
        </Button>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          {preview ? "Preview mode" : "No compiler: your instructor reviews and grades your code."}
        </Typography>
      </Box>
    </Box>
  );
}
