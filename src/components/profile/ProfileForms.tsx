"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { changePasswordAction, updateProfileAction } from "@/app/(student)/profile/actions";
import StudentFields from "@/components/students/StudentFields";
import { initialFormState, type FormState } from "@/lib/forms";

function Feedback({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <Alert severity={state.status === "success" ? "success" : "error"} sx={{ mb: 2 }}>
      {state.message}
    </Alert>
  );
}

export function PersonalInfoForm({ initial }: { initial: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, { ...initialFormState, values: initial });
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Personal information
      </Typography>
      <Box component="form" action={formAction} key={state.attempt}>
        <Feedback state={state} />
        <StudentFields values={state.values} errors={state.fieldErrors} withAccount={false} withStudentNumber={false} />
        <Button type="submit" variant="contained" disabled={pending} sx={{ mt: 2 }}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </Box>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const field = (name: string, label: string, autoComplete: string, helper?: string) => (
    <TextField
      name={name}
      label={label}
      type="password"
      size="small"
      required
      fullWidth
      autoComplete={autoComplete}
      error={Boolean(errors[name])}
      helperText={errors[name] ?? helper}
    />
  );
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Change password
      </Typography>
      <Box component="form" action={formAction} key={state.attempt} sx={{ display: "grid", gap: 2 }}>
        <Feedback state={state} />
        {field("currentPassword", "Current password", "current-password")}
        {field("newPassword", "New password", "new-password", "At least 8 characters, with a letter and a number.")}
        {field("confirmPassword", "Confirm new password", "new-password")}
        <Box>
          <Button type="submit" variant="contained" color="secondary" disabled={pending}>
            {pending ? "Changing..." : "Change password"}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
