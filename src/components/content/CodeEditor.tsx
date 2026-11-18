"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import { brand, monoFont } from "@/theme/tokens";

/**
 * Simpleng code editor para sa Java: may line numbers at Tab para mag-indent.
 * Walang compiler o "Run", ayon sa Scope ng PDF.
 */
export default function CodeEditor({
  value,
  onChange,
  minRows = 10,
  dark = false,
  readOnly = false,
  label,
}: {
  value: string;
  onChange?: (value: string) => void;
  minRows?: number;
  dark?: boolean;
  readOnly?: boolean;
  label: string;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = Math.max(minRows, value.split("\n").length);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || event.key !== "Tab") return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange?.(value.slice(0, start) + "    " + value.slice(end));
    requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
  };

  const colors = dark
    ? { bg: brand.navy, fg: "#E2E8F0", gutter: "#475569", border: "#1E2B40" }
    : { bg: "#F8FAFC", fg: "#0F172A", gutter: "#94A3B8", border: "#E2E8F0" };

  return (
    <Box sx={{ display: "flex", border: `1px solid ${colors.border}`, borderRadius: "10px", bgcolor: colors.bg, overflow: "hidden", fontFamily: monoFont, fontSize: 13, lineHeight: "21px" }}>
      <Box ref={gutterRef} aria-hidden sx={{ py: 1.25, px: 1, textAlign: "right", color: colors.gutter, userSelect: "none", overflow: "hidden", borderRight: `1px solid ${colors.border}`, minWidth: 38 }}>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </Box>
      <Box
        component="textarea"
        aria-label={label}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        wrap="off"
        rows={lines}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(event: React.UIEvent<HTMLTextAreaElement>) => {
          if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
        }}
        sx={{
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: "none",
          resize: "vertical",
          py: 1.25,
          px: 1.5,
          bgcolor: "transparent",
          color: colors.fg,
          font: "inherit",
          lineHeight: "inherit",
          whiteSpace: "pre",
          overflowX: "auto",
          tabSize: 4,
        }}
      />
    </Box>
  );
}
