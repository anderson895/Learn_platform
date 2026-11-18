import Box from "@mui/material/Box";

/** Maliit na status chip na ginagamit sa Syllabus Builder at Progress Board (Figs. 11 at 15). */
export default function MiniChip({
  label,
  color,
  bg,
  icon,
  mono = false,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.9,
        py: 0.25,
        borderRadius: "6px",
        fontSize: 11.5,
        fontWeight: 600,
        color,
        bgcolor: bg,
        whiteSpace: "nowrap",
        fontFamily: mono ? 'var(--font-mono), "JetBrains Mono", monospace' : undefined,
        "& svg": { fontSize: 13 },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}
