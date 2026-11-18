import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

/** Loading state ng mga page habang kinukuha ang data (fallback ng `<Suspense>`). */
export default function PageLoading({ rows = 4 }: { rows?: number }) {
  return (
    <Box aria-busy="true" aria-label="Loading">
      <Skeleton variant="text" width={220} height={36} />
      <Skeleton variant="text" width={160} sx={{ mb: 2 }} />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={56} sx={{ mb: 1.5 }} />
      ))}
    </Box>
  );
}
