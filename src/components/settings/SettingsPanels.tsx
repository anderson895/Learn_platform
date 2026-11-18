"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import {
  clearAuditLogsAction,
  createAnnouncementAction,
  deleteAnnouncementAction,
  deleteStudentAccountAction,
  resetStudentDataAction,
  saveSettingsAction,
} from "@/app/(admin)/admin/settings/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import type { AnnouncementDTO, AuditLogDTO } from "@/services/SystemService";
import { monoFont } from "@/theme/tokens";

type Feedback = { severity: "success" | "error"; text: string } | null;
const when = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// ── Testing & Cleanup ─────────────────────────────────────────────────────────

type StudentOption = { uid: string; label: string };
type Pending = { kind: "reset" | "delete" | "logs"; title: string; message: string } | null;

export function TestingPanel({ students }: { students: StudentOption[] }) {
  const [target, setTarget] = useState("all");
  const [pending, setPending] = useState<Pending>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const targetLabel = target === "all" ? "all students" : (students.find((s) => s.uid === target)?.label ?? "this student");

  const run = () =>
    pending &&
    startTransition(async () => {
      if (pending.kind === "reset") {
        const result = await resetStudentDataAction(target);
        setFeedback(result.ok ? { severity: "success", text: `Reset ${result.data.students} student(s): ${result.data.progress} progress record(s) and ${result.data.submissions} submission(s) deleted.` } : { severity: "error", text: result.message });
      } else if (pending.kind === "delete") {
        const result = await deleteStudentAccountAction(target);
        if (result.ok) setTarget("all");
        setFeedback(result.ok ? { severity: "success", text: "Student account deleted. The email and username can be used again." } : { severity: "error", text: result.message });
      } else {
        const result = await clearAuditLogsAction();
        setFeedback(result.ok ? { severity: "success", text: `${result.data} audit log entries deleted.` } : { severity: "error", text: result.message });
      }
      setPending(null);
    });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Alert severity="info">Use these tools to clean up test data so you can test again. Lessons, notes, quizzes and media are not affected.</Alert>
      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}
      <Card sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Student test data</Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
          Reset progress to re-test lesson unlocking and quizzes. Delete an account to register again with the same email and username.
        </Typography>
        <TextField select size="small" label="Student" value={target} onChange={(event) => setTarget(event.target.value)} sx={{ minWidth: 320, mb: 2 }}>
          <MenuItem value="all">All students ({students.length})</MenuItem>
          {students.map((student) => (
            <MenuItem key={student.uid} value={student.uid}>
              {student.label}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            color="warning"
            disabled={isPending || students.length === 0}
            onClick={() => setPending({ kind: "reset", title: "Reset progress & submissions?", message: `All lesson progress, quiz attempts, activity answers and coding submissions of ${targetLabel} will be deleted. Their accounts stay.` })}
          >
            Reset progress & submissions
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={isPending || target === "all"}
            onClick={() => setPending({ kind: "delete", title: "Delete account permanently?", message: `${targetLabel} will be deleted with all of their progress and submissions. This cannot be undone.` })}
          >
            Delete account permanently
          </Button>
        </Box>
      </Card>
      <Card sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Audit logs</Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>Clear the activity log collected while testing.</Typography>
        <Button variant="outlined" color="error" disabled={isPending} onClick={() => setPending({ kind: "logs", title: "Clear all audit logs?", message: "Every audit log entry will be deleted. This cannot be undone." })}>
          Clear audit logs
        </Button>
      </Card>
      <ConfirmDialog open={Boolean(pending)} title={pending?.title ?? ""} message={pending?.message ?? ""} confirmLabel="Yes, continue" danger pending={isPending} onClose={() => setPending(null)} onConfirm={run} />
    </Box>
  );
}

// ── Announcements ─────────────────────────────────────────────────────────────

export function AnnouncementsPanel({ announcements }: { announcements: AnnouncementDTO[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [deleting, setDeleting] = useState<AnnouncementDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const post = () =>
    startTransition(async () => {
      const result = await createAnnouncementAction({ title, body });
      if (result.ok) {
        setTitle("");
        setBody("");
        setErrors({});
        setFeedback({ severity: "success", text: "Announcement posted." });
      } else {
        setErrors(result.fieldErrors ?? {});
        setFeedback({ severity: "error", text: result.message });
      }
    });

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "380px 1fr" }, alignItems: "start" }}>
      <Card sx={{ p: 2.5, display: "grid", gap: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>New announcement</Typography>
        {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}
        <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={Boolean(errors.title)} helperText={errors.title} />
        <TextField size="small" label="Message" multiline minRows={4} value={body} onChange={(e) => setBody(e.target.value)} error={Boolean(errors.body)} helperText={errors.body} />
        <Button variant="contained" disabled={isPending} onClick={post}>
          {isPending ? "Posting..." : "Post announcement"}
        </Button>
      </Card>
      <Card sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Posted ({announcements.length})</Typography>
        {announcements.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No announcements yet.</Typography>}
        {announcements.map((item) => (
          <Box key={item.id} sx={{ display: "flex", gap: 1, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{item.title}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>{when(item.createdAt)}</Typography>
              <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{item.body}</Typography>
            </Box>
            <IconButton size="small" onClick={() => setDeleting(item)} aria-label={`Delete ${item.title}`}>
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Card>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete announcement?"
        message={`"${deleting?.title}" will be removed for everyone.`}
        confirmLabel="Delete"
        danger
        pending={isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          startTransition(async () => {
            const result = await deleteAnnouncementAction(deleting.id);
            setFeedback(result.ok ? null : { severity: "error", text: result.message });
            setDeleting(null);
          })
        }
      />
    </Box>
  );
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

const ACTION_STYLE: Record<AuditLogDTO["action"], { color: string; bg: string }> = {
  login: { color: "#0369A1", bg: "#E0F2FE" },
  logout: { color: "#64748B", bg: "#F1F5F9" },
  register: { color: "#7C3AED", bg: "#EDE9FE" },
  create: { color: "#059669", bg: "#D1FAE5" },
  update: { color: "#B45309", bg: "#FEF3C7" },
  publish: { color: "#2563EB", bg: "#DBEAFE" },
  delete: { color: "#DC2626", bg: "#FEE2E2" },
};

export function AuditLogPanel({ logs }: { logs: AuditLogDTO[] }) {
  return (
    <Card>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>User activity log</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Latest {logs.length} entries (logins, publishing, edits and deletions).</Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow sx={{ "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary" } }}>
              <TableCell>TIME</TableCell>
              <TableCell>USER</TableCell>
              <TableCell>ACTION</TableCell>
              <TableCell>TARGET</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{when(log.timestamp)}</TableCell>
                <TableCell sx={{ fontSize: 12.5 }}>{log.user}</TableCell>
                <TableCell>
                  <MiniChip label={log.action} color={ACTION_STYLE[log.action].color} bg={ACTION_STYLE[log.action].bg} />
                </TableCell>
                <TableCell sx={{ fontFamily: monoFont, fontSize: 12, color: "text.secondary" }}>{log.target}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                  No activity yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ── General & Backup ──────────────────────────────────────────────────────────

export function GeneralPanel({ defaultThreshold }: { defaultThreshold: number }) {
  const [value, setValue] = useState(String(defaultThreshold));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await saveSettingsAction({ defaultThreshold: value });
      setErrors(result.ok ? {} : (result.fieldErrors ?? {}));
      setFeedback(result.ok ? { severity: "success", text: "Settings saved." } : { severity: "error", text: result.message });
    });

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "start" }}>
      <Card sx={{ p: 2.5, display: "grid", gap: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>Accomplishment threshold</Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Default passing score for new modules. Each module can still have its own score in the Syllabus Builder.</Typography>
        {feedback && <Alert severity={feedback.severity}>{feedback.text}</Alert>}
        <TextField
          size="small"
          type="number"
          label="Default passing score (%)"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={Boolean(errors.defaultThreshold)}
          helperText={errors.defaultThreshold}
          slotProps={{ htmlInput: { min: 0, max: 100 } }}
          sx={{ maxWidth: 240 }}
        />
        <Box>
          <Button variant="contained" disabled={isPending} onClick={save}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Card>
      <Card sx={{ p: 2.5, display: "grid", gap: 1.5 }}>
        <Typography sx={{ fontWeight: 600 }}>Backup database</Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Download a JSON copy of all records: accounts, lessons, notes, assessments, answer keys, submissions, progress and logs. Keep it private, since it contains student data and quiz answers.
        </Typography>
        <Box>
          <Button variant="outlined" startIcon={<DownloadOutlined />} href="/api/admin/backup">
            Download backup (JSON)
          </Button>
        </Box>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Video and audio files stay in Cloudinary and are not included.</Typography>
      </Card>
    </Box>
  );
}
