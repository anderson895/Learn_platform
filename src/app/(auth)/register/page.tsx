import type { Metadata } from "next";
import Box from "@mui/material/Box";
import BrandPanel from "@/components/auth/BrandPanel";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Register" };

/** Student Registration. Pareho ang layout ng Cross-Login Interface (Fig. 7). */
export default function RegisterPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <Box sx={{ display: { xs: "none", md: "grid" }, position: "sticky", top: 0, height: "100vh" }}>
        <BrandPanel />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, py: 4, bgcolor: "background.default" }}>
        <RegisterForm />
      </Box>
    </Box>
  );
}
