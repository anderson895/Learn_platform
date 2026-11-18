import Box from "@mui/material/Box";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { brand, monoFont } from "@/theme/tokens";

/**
 * Nire-render ang lesson notes (Markdown). Hindi nito pinapayagan ang raw HTML, kaya ligtas sa script injection.
 * Ang code blocks ay madilim, gaya ng sa Syntax Reviewer (Fig. 14).
 */
export default function Markdown({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <Box
      sx={{
        fontSize: 14.5,
        lineHeight: 1.7,
        color: dark ? "#E2E8F0" : "text.primary",
        wordBreak: "break-word",
        "& h1": { fontSize: 22, fontWeight: 700, mt: 0, mb: 1.5 },
        "& h2": { fontSize: 17, fontWeight: 700, mt: 3, mb: 1 },
        "& h3": { fontSize: 15, fontWeight: 700, mt: 2, mb: 1 },
        "& p": { my: 1 },
        "& ul, & ol": { pl: 3, my: 1 },
        "& a": { color: "primary.main", textDecoration: "underline" },
        "& pre": {
          bgcolor: brand.navy,
          color: "#E2E8F0",
          borderRadius: "10px",
          p: 2,
          overflowX: "auto",
          fontSize: 13,
          lineHeight: 1.6,
          border: dark ? "1px solid #1E2B40" : 0,
        },
        "& code": { fontFamily: monoFont },
        "& :not(pre) > code": {
          bgcolor: dark ? "rgba(148,163,184,0.15)" : "#F1F5F9",
          color: dark ? "#7DD3FC" : "#0369A1",
          px: 0.6,
          py: 0.1,
          borderRadius: "4px",
          fontSize: "0.9em",
        },
        "& table": { borderCollapse: "collapse", my: 1.5 },
        "& th, & td": { border: "1px solid", borderColor: dark ? "#1E2B40" : "divider", px: 1, py: 0.5 },
        "& blockquote": { borderLeft: "3px solid", borderColor: "primary.main", m: 0, pl: 2, color: dark ? "#94A3B8" : "text.secondary" },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Box>
  );
}
