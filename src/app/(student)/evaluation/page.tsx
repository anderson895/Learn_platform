import { Suspense } from "react";
import type { Metadata } from "next";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import EvaluationForm from "@/components/evaluation/EvaluationForm";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { EvaluationService } from "@/services/EvaluationService";

export const metadata: Metadata = { title: "System Evaluation" };

/** PIECES Evaluation (Objective 3): sinasagutan ng students at faculty. */
export default function EvaluationPage() {
  return (
    <Suspense fallback={<PageLoading rows={4} />}>
      <EvaluationContent />
    </Suspense>
  );
}

async function EvaluationContent() {
  const user = await requireUser(["student", "admin", "chairman"]);
  const service = new EvaluationService();
  const [questionnaire, mine] = await Promise.all([service.getQuestionnaire(), service.getMyResponse(user.id)]);

  if (!questionnaire.isOpen) {
    return (
      <Card sx={{ maxWidth: 560, mx: "auto", p: 4, textAlign: "center" }}>
        <Box sx={{ width: 48, height: 48, mx: "auto", mb: 1.5, borderRadius: "12px", bgcolor: "#F1F5F9", color: "text.secondary", display: "grid", placeItems: "center" }}>
          <FactCheckOutlined />
        </Box>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>The system evaluation is not open</Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Your instructor will announce when you can answer it.</Typography>
        {user.role === "admin" && (
          <Button component={NextLink} href="/admin/evaluation?tab=questionnaire" variant="outlined" sx={{ mt: 2 }}>
            Open it in PIECES Evaluation
          </Button>
        )}
      </Card>
    );
  }

  return (
    <EvaluationForm
      questionnaire={{ instructions: questionnaire.instructions, criteria: questionnaire.criteria }}
      initial={mine}
      respondentType={user.role === "student" ? "student" : "faculty"}
    />
  );
}
