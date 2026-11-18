import { Suspense } from "react";
import type { Metadata } from "next";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ProgressService } from "@/services/ProgressService";

export const metadata: Metadata = { title: "Achievements" };

/** Achievement badges (Output, p. 38 ng PDF). */
export default function AchievementsPage() {
  return (
    <Suspense fallback={<PageLoading rows={3} />}>
      <AchievementsContent />
    </Suspense>
  );
}

async function AchievementsContent() {
  const user = await requireUser(["student", "admin"]);
  const badges = await new ProgressService().achievements(user.id);
  const earned = badges.filter((badge) => badge.earned).length;
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h5">Achievements</Typography>
        <Typography color="text.secondary" variant="body2">
          {earned} of {badges.length} badges earned
        </Typography>
      </Box>
      {user.role !== "student" && <Alert severity="info">Badges are earned by students as they complete lessons and assessments.</Alert>}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" } }}>
        {badges.map((badge) => (
          <Card key={badge.id} sx={{ p: 2.5, display: "flex", gap: 1.5, alignItems: "flex-start", opacity: badge.earned ? 1 : 0.6 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                bgcolor: badge.earned ? "#FEF3C7" : "#F1F5F9",
                color: badge.earned ? "#D97706" : "#94A3B8",
              }}
            >
              {badge.earned ? <EmojiEventsOutlined /> : <LockOutlined />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{badge.name}</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{badge.description}</Typography>
              <Typography sx={{ fontSize: 12, mt: 0.5, fontWeight: 600, color: badge.earned ? "success.main" : "text.disabled" }}>{badge.earned ? "Earned" : "Locked"}</Typography>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
