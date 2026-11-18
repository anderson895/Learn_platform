import type { Metadata } from "next";
import Box from "@mui/material/Box";
import BrandPanel from "@/components/auth/BrandPanel";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log In" };

/** Cross-Login Interface (Fig. 7). */
export default function LoginPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <BrandPanel />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, bgcolor: "background.default" }}>
        <LoginForm />
      </Box>
    </Box>
  );
}
