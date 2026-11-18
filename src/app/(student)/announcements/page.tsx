import { Suspense } from "react";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { SystemService } from "@/services/SystemService";

export const metadata: Metadata = { title: "Announcements" };

/** System announcements mula sa admin (pinakabago muna). */
export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<PageLoading rows={3} />}>
      <AnnouncementsContent />
    </Suspense>
  );
}

async function AnnouncementsContent() {
  await requireUser();
  const announcements = await new SystemService().listAnnouncements();
  return (
    <Box sx={{ maxWidth: 760, mx: "auto", display: "grid", gap: 2 }}>
      <Typography variant="h5">Announcements</Typography>
      {announcements.length === 0 && (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No announcements yet.</Typography>
        </Card>
      )}
      {announcements.map((item) => (
        <Card key={item.id} sx={{ p: 2.5, display: "flex", gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "#E0F2FE", color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CampaignOutlined fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>
              {new Date(item.createdAt).toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </Typography>
            <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{item.body}</Typography>
          </Box>
        </Card>
      ))}
    </Box>
  );
}
