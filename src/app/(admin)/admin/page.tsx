import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import LinkCard from "@/components/ui/LinkCard";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Dashboard" };

// Sprint 6: papalitan ng totoong bilang mula sa Firestore ang mga "—".
const stats = [
  { label: "MODULES RECORDED", value: "—", icon: <VideocamOutlined fontSize="small" />, color: "#0EA5E9", bg: "#E0F2FE" },
  { label: "PUBLISHED NOTES", value: "—", icon: <DescriptionOutlined fontSize="small" />, color: "#10B981", bg: "#D1FAE5" },
  { label: "ENROLLED STUDENTS", value: "—", icon: <PeopleOutlined fontSize="small" />, color: "#F59E0B", bg: "#FEF3C7" },
  { label: "QUIZZES CREATED", value: "—", icon: <MenuBookOutlined fontSize="small" />, color: "#8B5CF6", bg: "#EDE9FE" },
];

/** Admin Dashboard (Fig. 8). */
export default function AdminDashboardPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontSize: 20 }}>
        Good day, Educator 👋
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Here&apos;s your course overview for {site.course}.
      </Typography>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        {stats.map((stat) => (
          <Card key={stat.label} sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography variant="overline" sx={{ fontSize: 10.5, color: "text.secondary", lineHeight: 1 }}>
                {stat.label}
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "8px", display: "grid", placeItems: "center", color: stat.color, bgcolor: stat.bg }}>
                {stat.icon}
              </Box>
            </Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</Typography>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "grid", gap: 2, mt: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <LinkCard
          href="/admin/studio"
          title="Go to AV Studio"
          subtitle="Record or upload a lesson video"
          icon={<VideocamOutlined fontSize="small" color="primary" />}
        />
        <LinkCard
          href="/admin/notes"
          title="Open Notes Repository"
          subtitle="Draft a lecture script"
          icon={<DescriptionOutlined fontSize="small" color="success" />}
        />
      </Box>
    </Box>
  );
}
