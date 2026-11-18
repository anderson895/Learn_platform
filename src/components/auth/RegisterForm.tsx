"use client";

import { useActionState } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { registerAction } from "@/app/(auth)/actions";
import StudentFields from "@/components/students/StudentFields";
import { initialFormState } from "@/lib/forms";

/** Student Registration (Process: Student account registration). */
export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <Paper
      component="form"
      action={formAction}
      key={state.attempt}
      sx={{ width: "100%", maxWidth: 560, p: { xs: 3, sm: 3.5 }, borderRadius: "14px", border: 1, borderColor: "divider" }}
    >
      <Typography variant="h5">Create your student account</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Register to access the Computer Programming 1 lessons.
      </Typography>

      {state.status === "error" && state.message && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.message}
        </Alert>
      )}

      <StudentFields values={state.values} errors={errors} />

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mt: 2 }}>
        <TextField
          name="password"
          label="Password"
          type="password"
          size="small"
          required
          autoComplete="new-password"
          error={Boolean(errors.password)}
          helperText={errors.password ?? "At least 8 characters, with a letter and a number."}
        />
        <TextField
          name="confirmPassword"
          label="Confirm password"
          type="password"
          size="small"
          required
          autoComplete="new-password"
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword}
        />
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="secondary"
        disabled={pending}
        endIcon={pending ? <CircularProgress size={16} color="inherit" /> : <ChevronRight />}
        sx={{ py: 1.1, mt: 3 }}
      >
        {pending ? "Creating account..." : "Create Account"}
      </Button>

      <Box sx={{ mt: 2, textAlign: "center", fontSize: 13 }}>
        Already have an account?{" "}
        <Link component={NextLink} href="/login" sx={{ fontWeight: 600 }}>
          Log in
        </Link>
      </Box>
    </Paper>
  );
}
