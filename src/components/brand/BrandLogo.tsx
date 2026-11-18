import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { site } from "@/config/site";
import { monoFont } from "@/theme/tokens";

/** "CP1 / Learn Platform" logo (Figs. 7-15). Ang `tone` ay ayon sa kulay ng background. */
export default function BrandLogo({ subtitle, tone = "dark" }: { subtitle?: string; tone?: "dark" | "light" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "8px",
          bgcolor: "primary.main",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {site.shortCourse}
      </Box>
      <Box sx={{ lineHeight: 1.1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: tone === "dark" ? "#fff" : "text.primary" }}>
          {site.appName}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 11, fontFamily: monoFont, color: "primary.main" }}>{subtitle}</Typography>
        )}
      </Box>
    </Box>
  );
}
