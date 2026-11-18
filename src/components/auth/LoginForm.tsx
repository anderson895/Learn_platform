"use client";

import { useActionState, useState } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ChevronRight from "@mui/icons-material/ChevronRight";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import CastForEducationOutlined from "@mui/icons-material/CastForEducationOutlined";
import { loginAction } from "@/app/(auth)/actions";
import { initialFormState } from "@/lib/forms";

type LoginRole = "student" | "educator";

const fieldLabelSx = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "text.secondary", mb: 0.75 };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialFormState);
  const [role, setRole] = useState<LoginRole>((state.values?.portal as LoginRole) || "student");
  const errors = state.fieldErrors ?? {};

  return (
    <Paper
      component="form"
      action={formAction}
      key={state.attempt}
      sx={{ width: "100%", maxWidth: 380, p: { xs: 3, sm: 3.5 }, borderRadius: "14px", border: 1, borderColor: "divider" }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip size="small" variant="outlined" icon={<DesktopWindowsOutlined />} label="Desktop App" />
        <Chip size="small" variant="outlined" icon={<LanguageOutlined />} label="Web Compatible" />
      </Stack>

      <Typography variant="h5">Welcome back</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sign in to continue to your workspace
      </Typography>

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={role}
        onChange={(_, value: LoginRole | null) => value && setRole(value)}
        aria-label="Account type"
        sx={{ mb: 3 }}
      >
        {(["student", "educator"] as const).map((value) => (
          <ToggleButton
            key={value}
            value={value}
            sx={{
              gap: 0.75,
              textTransform: "none",
              fontWeight: 600,
              "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "secondary.main", color: "common.white" },
            }}
          >
            {value === "student" ? <SchoolOutlined fontSize="small" /> : <CastForEducationOutlined fontSize="small" />}
            {value === "student" ? "Student" : "Educator"}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <input type="hidden" name="portal" value={role} />

      <Typography component="label" htmlFor="identifier" sx={{ ...fieldLabelSx, display: "block" }}>
        USERNAME / EMAIL
      </Typography>
      <TextField
        id="identifier"
        name="identifier"
        autoComplete="username"
        defaultValue={state.values?.identifier ?? ""}
        error={Boolean(errors.identifier)}
        helperText={errors.identifier}
        required
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Typography component="label" htmlFor="password" sx={{ ...fieldLabelSx, display: "block" }}>
        PASSWORD
      </Typography>
      <TextField
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={Boolean(errors.password)}
        helperText={errors.password}
        required
        fullWidth
        size="small"
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {state.status === "error" && state.message && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.message}
        </Alert>
      )}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="secondary"
        disabled={pending}
        endIcon={pending ? <CircularProgress size={16} color="inherit" /> : <ChevronRight />}
        sx={{ py: 1.1 }}
      >
        {pending ? "Signing in..." : "Log In Securely"}
      </Button>

      <Divider sx={{ my: 2.5 }} />
      <Typography variant="caption" color="text.secondary" component="p" align="center">
        Role-based routing · Educators → Content Studio · Students → Workspace
      </Typography>
      {role === "student" && (
        <Box sx={{ mt: 1.5, textAlign: "center", fontSize: 13 }}>
          No account yet?{" "}
          <Link component={NextLink} href="/register" sx={{ fontWeight: 600 }}>
            Register
          </Link>
        </Box>
      )}
    </Paper>
  );
}
