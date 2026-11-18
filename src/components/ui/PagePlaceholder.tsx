import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/** Pansamantalang laman ng mga page na gagawin pa sa susunod na sprint. */
export default function PagePlaceholder({
  title,
  description,
  sprint,
  figure,
  items,
}: {
  title: string;
  description: string;
  sprint: number;
  figure?: string;
  items: string[];
}) {
  return (
    <Card sx={{ p: 3, maxWidth: 760 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Chip size="small" color="primary" variant="outlined" label={`Sprint ${sprint}`} />
        {figure && <Chip size="small" label={figure} />}
      </Stack>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary", fontSize: 14, "& li": { mb: 0.5 } }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Box>
    </Card>
  );
}
