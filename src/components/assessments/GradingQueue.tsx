"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { gradeSubmissionAction } from "@/app/(admin)/admin/assessments/actions";
import CodeEditor from "@/components/content/CodeEditor";
import MiniChip from "@/components/ui/MiniChip";
import type { GradingRow } from "@/domain/assessment/dto";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function GradeDialog({ row, onClose }: { row: GradingRow; onClose: () => void }) {
  const [score, setScore] = useState(row.score === null ? "" : String(row.score));
  const [feedback, setFeedback] = useState(row.feedback);
  const [showModel, setShowModel] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await gradeSubmissionAction(row.id, { score, feedback });
      if (result.ok) onClose();
      else {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message ?? null);
      }
    });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {row.exerciseTitle} · {row.studentName}
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {message && <Alert severity="error">{message}</Alert>}
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          {row.lessonLabel} · submitted {when(row.submittedAt)}
        </Typography>
        {row.instructions && <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{row.instructions}</Typography>}
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Student code</Typography>
          <CodeEditor label="Student code" value={row.code} readOnly dark minRows={8} />
        </Box>
        {row.modelSolution && (
          <Box>
            <Button size="small" onClick={() => setShowModel((value) => !value)}>
              {showModel ? "Hide model solution" : "Show model solution"}
            </Button>
            <Collapse in={showModel}>
              <CodeEditor label="Model solution" value={row.modelSolution} readOnly minRows={6} />
            </Collapse>
          </Box>
        )}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "160px 1fr" } }}>
          <TextField
            size="small"
            type="number"
            label={`Score (0–${row.maxScore})`}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            error={Boolean(errors.score)}
            helperText={errors.score}
            slotProps={{ htmlInput: { min: 0, max: row.maxScore } }}
          />
          <TextField
            size="small"
            label="Feedback for the student"
            multiline
            minRows={2}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            error={Boolean(errors.feedback)}
            helperText={errors.feedback}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={isPending || score === ""} onClick={save}>
          {isPending ? "Saving..." : "Save grade"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Pag-grade ng Coding Exercises / Assignments (walang automatic grading ng code). */
export default function GradingQueue({ rows }: { rows: GradingRow[] }) {
  const pending = rows.filter((row) => row.status === "submitted");
  const graded = rows.filter((row) => row.status === "graded");
  const [tab, setTab] = useState<"pending" | "graded">("pending");
  const [grading, setGrading] = useState<GradingRow | null>(null);
  const shown = tab === "pending" ? pending : graded;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontSize: 20 }}>
          Submissions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Coding exercises written by students. There is no compiler, so you review and grade each one.
        </Typography>
      </Box>
      <Card>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 1, borderBottom: 1, borderColor: "divider", "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}>
          <Tab value="pending" label={`Needs grading (${pending.length})`} />
          <Tab value="graded" label={`Graded (${graded.length})`} />
        </Tabs>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow sx={{ "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary" } }}>
                <TableCell>STUDENT</TableCell>
                <TableCell>LESSON</TableCell>
                <TableCell>EXERCISE</TableCell>
                <TableCell>SUBMITTED</TableCell>
                <TableCell>SCORE</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{row.studentName}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{row.studentNumber}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.lessonLabel}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.exerciseTitle}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{when(row.submittedAt)}</TableCell>
                  <TableCell>
                    {row.status === "graded" ? (
                      <MiniChip label={`${row.score}/${row.maxScore}`} color="#059669" bg="#D1FAE5" />
                    ) : (
                      <MiniChip label="Pending" color="#B45309" bg="#FEF3C7" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" variant={row.status === "graded" ? "text" : "contained"} onClick={() => setGrading(row)}>
                      {row.status === "graded" ? "Edit grade" : "Grade"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                    {tab === "pending" ? "Nothing to grade right now." : "No graded submissions yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      {grading && <GradeDialog key={grading.id} row={grading} onClose={() => setGrading(null)} />}
    </Box>
  );
}
