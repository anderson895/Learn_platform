"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import KeyOutlined from "@mui/icons-material/KeyOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  createStudentAction,
  resetStudentPasswordAction,
  setStudentStatusAction,
  updateStudentAction,
} from "@/app/(admin)/admin/students/actions";
import StudentFields from "@/components/students/StudentFields";
import { initialFormState } from "@/lib/forms";
import { monoFont } from "@/theme/tokens";
import type { StudentRow } from "@/services/StudentAccountService";

function TempPasswordNotice({ email, password }: { email: string; password: string }) {
  return (
    <Alert severity="success">
      <Typography sx={{ fontSize: 14, mb: 1 }}>
        Give these login details to the student. The password is shown only once.
      </Typography>
      <Box sx={{ fontFamily: monoFont, fontSize: 13 }}>
        <div>Email: {email}</div>
        <div>Temporary password: {password}</div>
      </Box>
      <Typography sx={{ fontSize: 12, mt: 1 }}>Ask the student to change it in Profile after logging in.</Typography>
    </Alert>
  );
}

function CreateStudentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createStudentAction, initialFormState);
  const created = state.status === "success" && state.data;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add student</DialogTitle>
      {created ? (
        <>
          <DialogContent>
            <TempPasswordNotice email={state.data!.email} password={state.data!.tempPassword} />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} variant="contained">
              Done
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box component="form" action={formAction} key={state.attempt}>
          <DialogContent sx={{ pt: 1 }}>
            {state.message && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.message}
              </Alert>
            )}
            <StudentFields values={state.values} errors={state.fieldErrors} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              A temporary password will be generated for the student.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Creating..." : "Create student"}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}

function EditStudentDialog({ row, onClose }: { row: StudentRow; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateStudentAction.bind(null, row.uid), {
    ...initialFormState,
    values: {
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      studentNumber: row.studentNumber,
      course: row.course,
      yearLevel: row.yearLevel,
    },
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit {row.fullName}</DialogTitle>
      <Box component="form" action={formAction} key={state.attempt}>
        <DialogContent sx={{ pt: 1 }}>
          {state.message && (
            <Alert severity={state.status === "success" ? "success" : "error"} sx={{ mb: 2 }}>
              {state.message}
            </Alert>
          )}
          <StudentFields values={state.values} errors={state.fieldErrors} withAccount={false} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Username: {row.username} · Email: {row.email}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

type Confirm = { kind: "status" | "reset"; row: StudentRow } | null;

export default function StudentAccountsManager({ rows }: { rows: StudentRow[] }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [result, setResult] = useState<{ severity: "success" | "error"; text: string; password?: string; email?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.fullName, row.studentNumber, row.username, row.email, row.course].some((value) => value.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const runConfirm = () => {
    if (!confirm) return;
    const { kind, row } = confirm;
    startTransition(async () => {
      if (kind === "status") {
        const next = row.status === "active" ? "inactive" : "active";
        const res = await setStudentStatusAction(row.uid, next);
        setResult(
          res.ok
            ? { severity: "success", text: `${row.fullName} is now ${next}.` }
            : { severity: "error", text: res.message ?? "Failed." },
        );
      } else {
        const res = await resetStudentPasswordAction(row.uid);
        setResult(
          res.ok && res.tempPassword
            ? { severity: "success", text: `Password reset for ${row.fullName}.`, password: res.tempPassword, email: row.email }
            : { severity: "error", text: res.message ?? "Failed." },
        );
      }
      setConfirm(null);
    });
  };

  const active = rows.filter((row) => row.status === "active").length;

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h5" sx={{ fontSize: 20 }}>
            Student Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {rows.length} registered · {active} active
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search name, ID, email..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ width: { xs: "100%", sm: 280 }, bgcolor: "background.paper" }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={() => {
            setCreateKey((key) => key + 1);
            setCreating(true);
          }}
        >
          Add Student
        </Button>
      </Box>

      {result && (
        <Box sx={{ mb: 2 }}>
          {result.password && result.email ? (
            <TempPasswordNotice email={result.email} password={result.password} />
          ) : (
            <Alert severity={result.severity} onClose={() => setResult(null)}>
              {result.text}
            </Alert>
          )}
        </Box>
      )}

      <Card>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow sx={{ "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em" } }}>
                <TableCell>STUDENT</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>COURSE</TableCell>
                <TableCell>USERNAME / EMAIL</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell align="right">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.uid} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{row.fullName}</TableCell>
                  <TableCell sx={{ fontFamily: monoFont, fontSize: 12, color: "primary.main" }}>{row.studentNumber}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    {row.course}
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{row.yearLevel}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    {row.username}
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{row.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      sx={
                        row.status === "active"
                          ? { bgcolor: "#E0F2FE", color: "#0369A1" }
                          : { bgcolor: "#F1F5F9", color: "#64748B" }
                      }
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => setEditing(row)} aria-label={`Edit ${row.fullName}`}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset password">
                      <IconButton size="small" onClick={() => setConfirm({ kind: "reset", row })} aria-label={`Reset password of ${row.fullName}`}>
                        <KeyOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={row.status === "active" ? "Deactivate" : "Activate"}>
                      <IconButton
                        size="small"
                        onClick={() => setConfirm({ kind: "status", row })}
                        aria-label={`${row.status === "active" ? "Deactivate" : "Activate"} ${row.fullName}`}
                      >
                        {row.status === "active" ? <BlockOutlined fontSize="small" /> : <CheckCircleOutlined fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                    {rows.length === 0 ? "No students yet. Students can register at /register, or add one here." : "No matching students."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateStudentDialog key={createKey} open={creating} onClose={() => setCreating(false)} />
      {editing && <EditStudentDialog key={editing.uid} row={editing} onClose={() => setEditing(null)} />}

      <Dialog open={Boolean(confirm)} onClose={() => !isPending && setConfirm(null)}>
        <DialogTitle>
          {confirm?.kind === "reset"
            ? "Reset password?"
            : confirm?.row.status === "active"
              ? "Deactivate account?"
              : "Activate account?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirm?.kind === "reset"
              ? `A new temporary password will be generated for ${confirm.row.fullName}. The old password will stop working.`
              : confirm?.row.status === "active"
                ? `${confirm.row.fullName} will be signed out and will not be able to log in until reactivated.`
                : `${confirm?.row.fullName} will be able to log in again.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={runConfirm} variant="contained" color={confirm?.kind === "status" && confirm.row.status === "active" ? "error" : "primary"} disabled={isPending}>
            {isPending ? "Working..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
