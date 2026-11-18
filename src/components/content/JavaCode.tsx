import Box from "@mui/material/Box";
import { monoFont } from "@/theme/tokens";

const KEYWORDS = new Set([
  "public", "private", "protected", "class", "static", "void", "int", "double", "float", "long", "short", "byte", "char", "boolean",
  "if", "else", "switch", "case", "default", "break", "continue", "return", "for", "while", "do", "new", "final", "import", "package",
  "try", "catch", "finally", "throw", "throws", "this", "super", "extends", "implements", "interface", "true", "false", "null", "String",
]);

const TOKEN = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[{}()[\];])/g;

/** Simpleng kulay ng Java syntax (keywords, strings, numbers, comments), gaya ng mga block sa Fig. 13. */
export default function JavaCode({ code, dark = false }: { code: string; dark?: boolean }) {
  const palette = dark
    ? { keyword: "#F472B6", string: "#86EFAC", number: "#FDBA74", comment: "#64748B", type: "#7DD3FC", punct: "#CBD5E1", text: "#E2E8F0" }
    : { keyword: "#C2410C", string: "#DC2626", number: "#059669", comment: "#94A3B8", type: "#2563EB", punct: "#475569", text: "#0F172A" };
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKEN)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > last) parts.push(code.slice(last, index));
    let color = palette.text;
    if (token.startsWith('"') || token.startsWith("'")) color = palette.string;
    else if (token.startsWith("//")) color = palette.comment;
    else if (/^\d/.test(token)) color = palette.number;
    else if (KEYWORDS.has(token)) color = palette.keyword;
    else if (/^[A-Z]/.test(token)) color = palette.type;
    else if (/^[{}()[\];]$/.test(token)) color = palette.punct;
    parts.push(
      <Box component="span" key={index} sx={{ color }}>
        {token}
      </Box>,
    );
    last = index + token.length;
  }
  if (last < code.length) parts.push(code.slice(last));
  return (
    <Box component="code" sx={{ fontFamily: monoFont, whiteSpace: "pre", color: palette.text }}>
      {parts}
    </Box>
  );
}
