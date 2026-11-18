"use client";

import { useMemo, useState, useTransition } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
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
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import {
  clearResponsesAction,
  resetQuestionnaireAction,
  saveQuestionnaireAction,
  setEvaluationOpenAction,
} from "@/app/(admin)/admin/evaluation/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import { AcceptabilityScale, LIKERT, round2, type Questionnaire } from "@/domain/evaluation/Pieces";
import { MAX_ITEMS_PER_CRITERION } from "@/lib/validation/evaluation";
import type { EvaluationResultsDTO } from "@/services/EvaluationService";
import { EVALUATION_TABS, type EvaluationTab } from "./tabs";

type Feedback = { severity: "success" | "error"; text: string } | null;

const wm = (value: number | null) => (value === null ? "—" : round2(value).toFixed(2));
const when = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Kulay ng verbal interpretation (berde kapag mataas, pula kapag mababa). */
function interpretationChip(mean: number | null) {
  const label = AcceptabilityScale.interpret(mean);
  const palette: Record<string, [string, string]> = {
    "Highly Acceptable": ["#047857", "#D1FAE5"],
    "Very Acceptable": ["#0369A1", "#E0F2FE"],
    "Moderately Acceptable": ["#B45309", "#FEF3C7"],
    "Slightly Acceptable": ["#C2410C", "#FFEDD5"],
    "Not Acceptable": ["#B91C1C", "#FEE2E2"],
  };
  const [color, bg] = palette[label] ?? ["#64748B", "#F1F5F9"];
  return <MiniChip label={label} color={color} bg={bg} />;
}

const headSx = { bgcolor: "#F8FAFC", "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" } };

export default function EvaluationAdmin({
  questionnaire,
  results,
  initialTab,
}: {
  questionnaire: Questionnaire;
  results: EvaluationResultsDTO;
  initialTab: EvaluationTab;
}) {
  const [tab, setTab] = useState<EvaluationTab>(EVALUATION_TABS.includes(initialTab) ? initialTab : "results");
  // Nasa parent ang feedback para hindi mawala kapag nire-mount ang panel pagkatapos mag-save.
  const [feedback, setFeedback] = useState<Feedback>(null);
  const total = results.summary.respondents.total;
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box className="no-print" sx={{ display: "flex", alignItems: "flex-end", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography variant="h5" sx={{ fontSize: 20 }}>
            PIECES Evaluation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Level of acceptability of the system based on Performance, Information, Efficiency, Control, Economic and Security.
          </Typography>
        </Box>
        <MiniChip label={questionnaire.isOpen ? "Open for answers" : "Closed"} color={questionnaire.isOpen ? "#047857" : "#64748B"} bg={questionnaire.isOpen ? "#D1FAE5" : "#F1F5F9"} />
      </Box>
      <Card className="no-print">
        <Tabs
          value={tab}
          onChange={(_, value) => {
            setTab(value);
            setFeedback(null);
          }}
          variant="scrollable" sx={{ px: 1, "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}>
          <Tab value="results" label="Results" />
          <Tab value="questionnaire" label="Questionnaire" />
          <Tab value="respondents" label={`Respondents (${total})`} />
        </Tabs>
      </Card>
      {feedback && (
        <Alert className="no-print" severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}
      {tab === "results" && <ResultsPanel results={results} />}
      {tab === "questionnaire" && (
        // Bagong draft kapag nagbago ang naka-save na mga tanong (hindi kapag binuksan/isinara lang).
        <QuestionnairePanel key={JSON.stringify({ ...questionnaire, isOpen: null })} questionnaire={questionnaire} responseCount={total} onFeedback={setFeedback} />
      )}
      {tab === "respondents" && <RespondentsPanel results={results} onFeedback={setFeedback} />}
    </Box>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function ResultsPanel({ results }: { results: EvaluationResultsDTO }) {
  const { summary, comments } = results;
  const cards = [
    { label: "RESPONDENTS", value: String(summary.respondents.total) },
    { label: "STUDENTS", value: String(summary.respondents.student) },
    { label: "FACULTY", value: String(summary.respondents.faculty) },
  ];
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box className="no-print" sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} href="/api/evaluation/summary">
          Summary CSV
        </Button>
        <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} href="/api/evaluation/responses">
          Raw responses CSV
        </Button>
        <Button size="small" variant="outlined" color="inherit" startIcon={<PrintOutlined />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(3, 1fr) 1.6fr" } }}>
        {cards.map((card) => (
          <Card key={card.label} sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ fontSize: 10.5, color: "text.secondary" }}>
              {card.label}
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{card.value}</Typography>
          </Card>
        ))}
        <Card sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ fontSize: 10.5, color: "text.secondary" }}>
            OVERALL WEIGHTED MEAN
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{wm(summary.overall)}</Typography>
            {interpretationChip(summary.overall)}
          </Box>
        </Card>
      </Box>

      {summary.respondents.total === 0 && <Alert severity="info">No responses yet. Open the evaluation in the Questionnaire tab so students and faculty can answer it at /evaluation.</Alert>}

      <Card>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>Summary of the PIECES Evaluation</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Weighted mean (WM) per criterion. The overall WM is the average of the six criteria.</Typography>
        </Box>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow sx={headSx}>
                <TableCell>CRITERION</TableCell>
                <TableCell align="center">STUDENTS WM</TableCell>
                <TableCell align="center">FACULTY WM</TableCell>
                <TableCell align="center">OVERALL WM</TableCell>
                <TableCell>VERBAL INTERPRETATION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.criteria.map((criterion) => (
                <TableRow key={criterion.key} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{criterion.name}</TableCell>
                  <TableCell align="center">{wm(criterion.byGroup.student)}</TableCell>
                  <TableCell align="center">{wm(criterion.byGroup.faculty)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {wm(criterion.mean)}
                  </TableCell>
                  <TableCell>{interpretationChip(criterion.mean)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "#F8FAFC", "& td": { fontWeight: 700 } }}>
                <TableCell>Overall</TableCell>
                <TableCell align="center">{wm(summary.overallByGroup.student)}</TableCell>
                <TableCell align="center">{wm(summary.overallByGroup.faculty)}</TableCell>
                <TableCell align="center">{wm(summary.overall)}</TableCell>
                <TableCell>{interpretationChip(summary.overall)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {summary.criteria.map((criterion) => (
        <Card key={criterion.key} sx={{ breakInside: "avoid" }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>{criterion.name}</Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Number of respondents per rating, weighted mean and verbal interpretation per statement.</Typography>
          </Box>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow sx={headSx}>
                  <TableCell>#</TableCell>
                  <TableCell>STATEMENT</TableCell>
                  {LIKERT.map((option) => (
                    <TableCell key={option.value} align="center">
                      {option.short} ({option.value})
                    </TableCell>
                  ))}
                  <TableCell align="center">WM</TableCell>
                  <TableCell>INTERPRETATION</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {criterion.items.map((item, index) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ color: "text.secondary" }}>{index + 1}</TableCell>
                    <TableCell sx={{ fontSize: 13, minWidth: 280 }}>{item.text}</TableCell>
                    {LIKERT.map((option) => (
                      <TableCell key={option.value} align="center" sx={{ color: item.distribution[option.value] ? "text.primary" : "text.disabled" }}>
                        {item.distribution[option.value]}
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      {wm(item.mean)}
                    </TableCell>
                    <TableCell>{interpretationChip(item.mean)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: "#F8FAFC", "& td": { fontWeight: 700 } }}>
                  <TableCell />
                  <TableCell>Average</TableCell>
                  <TableCell colSpan={5} />
                  <TableCell align="center">{wm(criterion.mean)}</TableCell>
                  <TableCell>{interpretationChip(criterion.mean)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ))}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "340px 1fr" }, alignItems: "start" }}>
        <Card sx={{ breakInside: "avoid" }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Scale and interpretation</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={headSx}>
                <TableCell>SCALE</TableCell>
                <TableCell>RANGE</TableCell>
                <TableCell>INTERPRETATION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {AcceptabilityScale.RANGES.map((range, index) => (
                <TableRow key={range.label}>
                  <TableCell>{5 - index}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {range.min.toFixed(2)} – {range.max.toFixed(2)}
                  </TableCell>
                  <TableCell>{range.label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Comments and suggestions ({comments.length})</Typography>
          {comments.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No comments yet.</Typography>}
          <Box sx={{ display: "grid", gap: 1 }}>
            {comments.map((comment, index) => (
              <Box key={index} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "#F8FAFC", border: "1px solid", borderColor: "divider" }}>
                <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{comment.text}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.5 }}>
                  {comment.type === "student" ? "Student" : "Faculty"} · {when(comment.submittedAt)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

// ── Questionnaire editor ──────────────────────────────────────────────────────

const newItemId = (key: string) => `${key.slice(0, 3)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function QuestionnairePanel({
  questionnaire,
  responseCount,
  onFeedback: setFeedback,
}: {
  questionnaire: Questionnaire;
  responseCount: number;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [draft, setDraft] = useState(questionnaire);
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dirty = useMemo(
    () => JSON.stringify({ ...draft, isOpen: null }) !== JSON.stringify({ ...questionnaire, isOpen: null }),
    [draft, questionnaire],
  );

  const updateCriterion = (key: string, change: (criterion: Questionnaire["criteria"][number]) => Questionnaire["criteria"][number]) =>
    setDraft((current) => ({ ...current, criteria: current.criteria.map((criterion) => (criterion.key === key ? change(criterion) : criterion)) }));

  const toggleOpen = (isOpen: boolean) =>
    startTransition(async () => {
      const result = await setEvaluationOpenAction(isOpen);
      setFeedback(result.ok ? { severity: "success", text: isOpen ? "The evaluation is now open. Students and faculty can answer it at /evaluation." : "The evaluation is now closed." } : { severity: "error", text: result.message });
    });

  const save = () =>
    startTransition(async () => {
      const result = await saveQuestionnaireAction({ ...draft, isOpen: questionnaire.isOpen });
      setFeedback(result.ok ? { severity: "success", text: "Questionnaire saved." } : { severity: "error", text: result.message });
    });

  const reset = () =>
    startTransition(async () => {
      const result = await resetQuestionnaireAction();
      setConfirm(false);
      setFeedback(result.ok ? { severity: "success", text: "The default questions were restored." } : { severity: "error", text: result.message });
    });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Card sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography sx={{ fontWeight: 600 }}>Accept answers</Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            When open, students and faculty (educator and chairman) see an &quot;Evaluation&quot; link and can answer once. They can change their answers until you close it.
          </Typography>
        </Box>
        <FormControlLabel
          control={<Switch checked={questionnaire.isOpen} onChange={(event) => toggleOpen(event.target.checked)} disabled={isPending} />}
          label={questionnaire.isOpen ? "Open" : "Closed"}
        />
        <Button component={NextLink} href="/evaluation" target="_blank" size="small" variant="outlined" endIcon={<OpenInNewOutlined />}>
          Preview / answer
        </Button>
      </Card>

      {responseCount > 0 && (
        <Alert severity="warning">
          {responseCount} response(s) already collected. Changing the wording of a question keeps its existing answers. Removing a question removes it from the results. Edit the questions before you open the evaluation.
        </Alert>
      )}

      <Card sx={{ p: 2.5 }}>
        <TextField
          label="Instructions for respondents"
          multiline
          minRows={3}
          fullWidth
          value={draft.instructions}
          onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />
      </Card>

      {draft.criteria.map((criterion) => (
        <Card key={criterion.key} sx={{ p: 2.5, display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#E0F2FE", color: "primary.main", display: "grid", placeItems: "center", fontWeight: 800 }}>
              {criterion.name.charAt(0)}
            </Box>
            <Typography sx={{ fontWeight: 700, flex: 1 }}>{criterion.name}</Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {criterion.items.length}/{MAX_ITEMS_PER_CRITERION} questions
            </Typography>
          </Box>
          <TextField
            size="small"
            label="Description"
            value={criterion.description}
            onChange={(event) => updateCriterion(criterion.key, (c) => ({ ...c, description: event.target.value }))}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
          {criterion.items.map((item, index) => (
            <Box key={item.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Typography sx={{ width: 22, pt: 1, fontSize: 13, fontWeight: 600, color: "text.secondary", textAlign: "right" }}>{index + 1}.</Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                value={item.text}
                error={!item.text.trim()}
                helperText={!item.text.trim() ? "Question text is required." : undefined}
                onChange={(event) => updateCriterion(criterion.key, (c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, text: event.target.value } : i)) }))}
                slotProps={{ htmlInput: { maxLength: 300, "aria-label": `${criterion.name} question ${index + 1}` } }}
              />
              <IconButton
                aria-label={`Remove ${criterion.name} question ${index + 1}`}
                disabled={criterion.items.length <= 1}
                onClick={() => updateCriterion(criterion.key, (c) => ({ ...c, items: c.items.filter((i) => i.id !== item.id) }))}
              >
                <DeleteOutlineOutlined fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box>
            <Button
              size="small"
              startIcon={<AddOutlined />}
              disabled={criterion.items.length >= MAX_ITEMS_PER_CRITERION}
              onClick={() => updateCriterion(criterion.key, (c) => ({ ...c, items: [...c.items, { id: newItemId(c.key), text: "" }] }))}
            >
              Add question
            </Button>
          </Box>
        </Card>
      ))}

      <Card sx={{ p: 2, display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap", position: "sticky", bottom: 12, zIndex: 2 }}>
        {dirty && <Typography sx={{ fontSize: 13, color: "warning.main", mr: "auto", alignSelf: "center" }}>You have unsaved changes.</Typography>}
        <Button color="inherit" onClick={() => setConfirm(true)} disabled={isPending}>
          Reset to default
        </Button>
        <Button color="inherit" onClick={() => setDraft(questionnaire)} disabled={isPending || !dirty}>
          Discard changes
        </Button>
        <Button variant="contained" onClick={save} disabled={isPending || !dirty}>
          {isPending ? "Saving..." : "Save questionnaire"}
        </Button>
      </Card>

      <ConfirmDialog
        open={confirm}
        title="Reset to the default questions?"
        message="This replaces all questions and instructions with the standard PIECES questionnaire. Collected responses are not deleted."
        confirmLabel="Reset"
        pending={isPending}
        onConfirm={reset}
        onClose={() => setConfirm(false)}
      />
    </Box>
  );
}

// ── Respondents ───────────────────────────────────────────────────────────────

function RespondentsPanel({ results, onFeedback: setFeedback }: { results: EvaluationResultsDTO; onFeedback: (feedback: Feedback) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clear = () =>
    startTransition(async () => {
      const result = await clearResponsesAction();
      setConfirm(false);
      setFeedback(result.ok ? { severity: "success", text: `${result.data} response(s) deleted.` } : { severity: "error", text: result.message });
    });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Alert severity="info">Names are shown here only so you can track who has answered. Comments and the CSV exports do not include names.</Alert>
      <Card>
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, flex: 1 }}>Respondents</Typography>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineOutlined />} disabled={results.respondents.length === 0 || isPending} onClick={() => setConfirm(true)}>
            Clear all responses
          </Button>
        </Box>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow sx={headSx}>
                <TableCell>NAME</TableCell>
                <TableCell>TYPE</TableCell>
                <TableCell>SUBMITTED</TableCell>
                <TableCell>LAST UPDATED</TableCell>
                <TableCell align="center">MEAN</TableCell>
                <TableCell>INTERPRETATION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.respondents.map((respondent) => (
                <TableRow key={respondent.uid} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{respondent.name}</TableCell>
                  <TableCell>{respondent.type === "student" ? "Student" : "Faculty"}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{when(respondent.submittedAt)}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{when(respondent.updatedAt)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {wm(respondent.mean)}
                  </TableCell>
                  <TableCell>{interpretationChip(respondent.mean)}</TableCell>
                </TableRow>
              ))}
              {results.respondents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                    No responses yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Delete all responses?"
        message={`This permanently deletes ${results.respondents.length} response(s), for example after testing. Download the CSV first if you need a copy.`}
        confirmLabel="Delete all"
        danger
        pending={isPending}
        onConfirm={clear}
        onClose={() => setConfirm(false)}
      />
    </Box>
  );
}
