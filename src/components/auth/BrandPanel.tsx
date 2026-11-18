import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import BrandLogo from "@/components/brand/BrandLogo";
import { brand, monoFont } from "@/theme/tokens";

const features = [
  "Role-aware routing engine",
  "Built-in AV lecture studio",
  "Color-coded progress tracking",
  "Interactive code exercises",
];

// Mga "node" at linya ng background graphic (Fig. 7). Java na ang mga snippet.
const nodes: [number, number][] = [
  [250, 120], [400, 175], [500, 210], [585, 275], [200, 245], [315, 260],
  [435, 325], [550, 360], [215, 375], [345, 445], [515, 425], [480, 475], [270, 540], [385, 525],
];
const edges: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [4, 5], [5, 2], [5, 1], [2, 6], [6, 7], [8, 5], [8, 9], [9, 6], [9, 10], [10, 11], [9, 13], [13, 12], [13, 10],
];
const snippets: [number, number, string][] = [
  [225, 200, "public class Main {"],
  [455, 160, "import java.util.Scanner;"],
  [395, 395, "for (int i = 0; i < n; i++)"],
  [190, 475, 'System.out.println("Hello");'],
  [290, 590, "return sum; }"],
];

export default function BrandPanel() {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        p: 4,
        color: "#fff",
        backgroundColor: brand.navy,
        backgroundImage: `radial-gradient(circle at 65% 45%, #0B3157 0%, ${brand.navy} 62%)`,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 640 680"
        aria-hidden
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        preserveAspectRatio="xMidYMid slice"
      >
        {edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="#0EA5E9"
            strokeOpacity={0.35}
            strokeDasharray="3 4"
          />
        ))}
        {nodes.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="#38BDF8" />
        ))}
        {snippets.map(([x, y, text]) => (
          <text key={text} x={x} y={y} fill="#0EA5E9" fillOpacity={0.45} fontSize={12} fontFamily="monospace">
            {text}
          </text>
        ))}
      </Box>

      <Box sx={{ position: "relative" }}>
        <BrandLogo subtitle="v1.0.0 · desktop" />
        <Typography sx={{ mt: 5, fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>
          Computer
          <br />
          Programming
          <br />
          <Box component="span" sx={{ color: "primary.main" }}>
            Level 1
          </Box>
        </Typography>
        <Typography sx={{ mt: 1.5, maxWidth: 300, fontSize: 13.5, color: "#CBD5E1" }}>
          An interactive, syllabus-based e-learning environment designed for desktop mastery.
        </Typography>
        <Box component="ul" sx={{ mt: 3, p: 0, listStyle: "none", fontSize: 12.5, color: "#CBD5E1" }}>
          {features.map((feature) => (
            <Box component="li" key={feature} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "2px", bgcolor: "primary.main" }} />
              {feature}
            </Box>
          ))}
        </Box>
      </Box>

      <Typography sx={{ position: "relative", mt: "auto", fontSize: 11, fontFamily: monoFont, color: "#475569" }}>
        Optimized · 1920 × 1080 · Desktop Widescreen
      </Typography>
    </Box>
  );
}
