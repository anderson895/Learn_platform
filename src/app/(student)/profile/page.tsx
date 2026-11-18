import { Suspense } from "react";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { ChangePasswordForm, PersonalInfoForm } from "@/components/profile/ProfileForms";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { StudentProfileRepository } from "@/repositories/StudentProfileRepository";

export const metadata: Metadata = { title: "Profile" };

const roleLabel = { student: "Student", admin: "Educator (Admin)", chairman: "Chairman" } as const;

/** Manage Profile (Fig. 5). */
export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoading rows={3} />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const user = await requireUser();
  const profile = user.role === "student" ? await new StudentProfileRepository().findById(user.id) : null;
  const props = profile?.toProps();

  const rows: [string, string][] = [
    ["Username", user.username],
    ["Email", user.email],
    ["Role", roleLabel[user.role]],
    ...(props ? ([["Student number", props.studentNumber]] as [string, string][]) : []),
    ["Member since", user.createdAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })],
  ];

  return (
    <Box sx={{ maxWidth: 820, mx: "auto", display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h5">{profile?.fullName ?? user.username}</Typography>
        <Chip size="small" label={roleLabel[user.role]} color="primary" variant="outlined" sx={{ mt: 0.5 }} />
      </Box>

      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Account
        </Typography>
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" }, rowGap: 1 }}>
          {rows.map(([label, value]) => (
            <Box key={label} sx={{ display: "contents" }}>
              <Typography component="dt" sx={{ fontSize: 13, color: "text.secondary" }}>
                {label}
              </Typography>
              <Typography component="dd" sx={{ m: 0, fontSize: 14, fontWeight: 500 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Your username, email and role can be changed by your instructor (administrator).
        </Typography>
      </Card>

      {props && (
        <PersonalInfoForm
          initial={{
            firstName: props.firstName,
            middleName: props.middleName,
            lastName: props.lastName,
            course: props.course,
            yearLevel: props.yearLevel,
          }}
        />
      )}
      <ChangePasswordForm />
    </Box>
  );
}
