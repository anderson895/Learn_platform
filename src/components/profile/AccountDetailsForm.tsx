"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Collapse from "@mui/material/Collapse";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { updateMyAccountAction } from "@/app/(admin)/admin/account/actions";
import { initialFormState } from "@/lib/forms";

/** Account details ng admin: pangalan, username at email (Table 11). */
export default function AccountDetailsForm({ initial }: { initial: { displayName: string; username: string; email: string } }) {
  const [state, formAction, pending] = useActionState(updateMyAccountAction, { ...initialFormState, values: initial });
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};
  const [email, setEmail] = useState(values.email);
  const emailChanged = email.trim().toLowerCase() !== initial.email;

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Account details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your name appears on lessons, the dashboard and the top bar. You can log in with your username or email.
      </Typography>
      <Box component="form" action={formAction} key={state.attempt} sx={{ display: "grid", gap: 2 }}>
        {state.status !== "idle" && state.message && <Alert severity={state.status === "success" ? "success" : "error"}>{state.message}</Alert>}
        <TextField name="displayName" label="Name" size="small" required defaultValue={values.displayName} error={Boolean(errors.displayName)} helperText={errors.displayName ?? "e.g. Prof. Pedro Santos"} />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField name="username" label="Username" size="small" required autoComplete="username" defaultValue={values.username} error={Boolean(errors.username)} helperText={errors.username} />
          <TextField
            name="email"
            label="Email"
            type="email"
            size="small"
            required
            autoComplete="email"
            defaultValue={values.email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
        </Box>
        <Collapse in={emailChanged || Boolean(errors.currentPassword)}>
          <TextField
            name="currentPassword"
            label="Current password"
            type="password"
            size="small"
            fullWidth
            autoComplete="current-password"
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword ?? "Required to change your email, since you use it to log in."}
          />
        </Collapse>
        <Box>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
