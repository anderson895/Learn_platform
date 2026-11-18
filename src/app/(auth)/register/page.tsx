import type { Metadata } from "next";
import Box from "@mui/material/Box";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <PagePlaceholder
        sprint={1}
        title="Student Registration"
        description="Paggawa ng student account (Process: Student account registration)."
        items={[
          "Form: first, middle at last name, student number, course, year level, email at password",
          "Gagawa ng Firebase Auth user, ng accounts/{uid} (role: student) at ng students/{uid}",
          "Validation gamit ang zod",
        ]}
      />
    </Box>
  );
}
