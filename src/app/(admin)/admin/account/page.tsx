import { Suspense } from "react";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AccountDetailsForm from "@/components/profile/AccountDetailsForm";
import { ChangePasswordForm } from "@/components/profile/ProfileForms";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Account" };

/** My Account ng admin: account details at pagpalit ng password. */
export default function MyAccountPage() {
  return (
    <Suspense fallback={<PageLoading rows={3} />}>
      <MyAccountContent />
    </Suspense>
  );
}

async function MyAccountContent() {
  const admin = await requireUser(["admin"]);
  return (
    <Box sx={{ maxWidth: 760, display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontSize: 20 }}>
          My Account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Educator account · member since {admin.createdAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
        </Typography>
      </Box>
      <AccountDetailsForm initial={{ displayName: admin.toAccountProps().displayName ?? "", username: admin.username, email: admin.email }} />
      <ChangePasswordForm />
    </Box>
  );
}
