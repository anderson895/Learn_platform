"use client";

import { useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CloudOutlined from "@mui/icons-material/CloudOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import { deleteStorageAssetsAction } from "@/app/(admin)/admin/settings/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MiniChip from "@/components/ui/MiniChip";
import { formatBytes } from "@/domain/content/Media";
import type { StorageOverview } from "@/services/StorageService";
import { monoFont } from "@/theme/tokens";

type Filter = "all" | "unused" | "samples";

/** Antas ng paggamit ng free tier: berde (maluwag), dilaw (napupuno), pula (halos puno). */
function level(percent: number) {
  if (percent >= 85) return { color: "error" as const, text: "Almost full — delete unused files to avoid upload errors." };
  if (percent >= 60) return { color: "warning" as const, text: "Getting full — consider deleting files you no longer need." };
  return { color: "success" as const, text: "Plenty of space left on the free plan." };
}

/** Cloudinary storage ng free tier: usage, listahan ng mga file at pagbura (Settings → Storage). */
export default function StoragePanel({ overview }: { overview: StorageOverview | null }) {
  const [filter, setFilter] = useState<Filter>("unused");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  // Itinatago agad ang mga nabura; minsan nahuhuli ang listahan ng Cloudinary pagkatapos magbura.
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const assets = useMemo(() => (overview?.assets ?? []).filter((asset) => !removed.has(asset.publicId)), [overview, removed]);
  const shown = useMemo(
    () => assets.filter((asset) => (filter === "unused" ? !asset.usedBy : filter === "samples" ? asset.isSample : true)),
    [assets, filter],
  );
  const chosen = assets.filter((asset) => selected.has(asset.publicId));
  const chosenBytes = chosen.reduce((sum, asset) => sum + asset.bytes, 0);
  const chosenInUse = chosen.filter((asset) => asset.usedBy).length;

  if (!overview) {
    return <Alert severity="error">Could not connect to Cloudinary. Check the Cloudinary keys in .env.local.</Alert>;
  }
  const usage = overview.usage;
  // Ang report ng Cloudinary ay naa-update lang mga isang beses bawat araw, kaya ang storage ay kinukuwenta
  // mula sa aktuwal na laki ng mga file ngayon (1 credit ≈ 1 GB), at idinadagdag ang bandwidth at transformations.
  const liveStorageCredits = overview.totals.bytes / 1024 ** 3;
  const creditsUsed = usage ? Math.max(usage.credits.used, liveStorageCredits + usage.bandwidth.credits + usage.transformations.credits) : 0;
  const percent = usage && usage.credits.limit ? (creditsUsed / usage.credits.limit) * 100 : 0;
  const status = level(percent);

  const toggle = (publicId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  const allShownSelected = shown.length > 0 && shown.every((asset) => selected.has(asset.publicId));
  const toggleAll = () =>
    setSelected((current) => {
      const next = new Set(current);
      shown.forEach((asset) => (allShownSelected ? next.delete(asset.publicId) : next.add(asset.publicId)));
      return next;
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteStorageAssetsAction(chosen.map(({ publicId, resourceType }) => ({ publicId, resourceType })));
      setConfirming(false);
      if (result.ok) {
        setRemoved((current) => new Set([...current, ...chosen.map((asset) => asset.publicId)]));
        setSelected(new Set());
        setMessage({ severity: "success", text: `Deleted ${result.data} file(s), about ${formatBytes(chosenBytes)}. Cloudinary may take up to a day to update the usage numbers.` });
      } else {
        setMessage({ severity: "error", text: result.message });
      }
    });

  const breakdown: [string, string, number][] = usage
    ? [
        ["Storage (files right now)", formatBytes(overview.totals.bytes), liveStorageCredits],
        ["Bandwidth (this month)", formatBytes(usage.bandwidth.bytes), usage.bandwidth.credits],
        ["Transformations", usage.transformations.count.toLocaleString(), usage.transformations.credits],
      ]
    : [];

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Card sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <CloudOutlined sx={{ color: "text.secondary" }} />
          <Typography sx={{ fontWeight: 600, flex: 1 }}>Cloudinary usage {usage?.plan ? `· ${usage.plan} plan` : ""}</Typography>
          {usage && <MiniChip label={`${percent.toFixed(1)}% used`} color={status.color === "error" ? "#DC2626" : status.color === "warning" ? "#B45309" : "#059669"} bg={status.color === "error" ? "#FEE2E2" : status.color === "warning" ? "#FEF3C7" : "#D1FAE5"} />}
        </Box>
        {usage ? (
          <>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{creditsUsed.toFixed(2)}</Typography>
              <Typography sx={{ color: "text.secondary" }}>of {usage.credits.limit} monthly credits (estimate)</Typography>
            </Box>
            <LinearProgress variant="determinate" value={Math.min(100, percent)} color={status.color} sx={{ height: 8, borderRadius: 4, mb: 1 }} aria-label="Cloudinary credits used" />
            <Alert severity={status.color === "success" ? "success" : status.color} sx={{ mb: 2 }}>
              {status.text}
            </Alert>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
              {breakdown.map(([label, amount, credits]) => (
                <Box key={label} sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: "10px" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{amount}</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{credits.toFixed(2)} credits</Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1.5 }}>
              1 credit ≈ 1 GB storage, 1 GB bandwidth or 1,000 transformations. Max {formatBytes(usage.maxVideoBytes)} per video. Storage is counted from your files right now;
              bandwidth and transformations come from Cloudinary&apos;s daily report{usage.lastUpdated ? ` (last updated ${usage.lastUpdated})` : ""}, which says{" "}
              {usage.credits.used.toFixed(2)} credits used.
            </Typography>
          </>
        ) : (
          <Alert severity="warning">{overview.usageError ?? "Usage is not available right now."}</Alert>
        )}
      </Card>

      {message && (
        <Alert severity={message.severity} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontWeight: 600 }}>Files in Cloudinary</Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
              {overview.totals.count} files · {formatBytes(overview.totals.bytes)} total · {overview.totals.unusedCount} not used by any lesson ({formatBytes(overview.totals.unusedBytes)})
            </Typography>
          </Box>
          {(["unused", "samples", "all"] as const).map((key) => (
            <Chip
              key={key}
              size="small"
              clickable
              color={filter === key ? "primary" : "default"}
              variant={filter === key ? "filled" : "outlined"}
              onClick={() => setFilter(key)}
              label={key === "unused" ? `Not used (${overview.totals.unusedCount})` : key === "samples" ? `Cloudinary samples (${assets.filter((a) => a.isSample).length})` : `All (${assets.length})`}
            />
          ))}
          <Button variant="contained" color="error" size="small" startIcon={<DeleteOutlineOutlined />} disabled={chosen.length === 0 || isPending} onClick={() => setConfirming(true)}>
            Delete selected{chosen.length ? ` (${chosen.length} · ${formatBytes(chosenBytes)})` : ""}
          </Button>
        </Box>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow sx={{ "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary" } }}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={allShownSelected} indeterminate={!allShownSelected && shown.some((a) => selected.has(a.publicId))} onChange={toggleAll} slotProps={{ input: { "aria-label": "Select all shown files" } }} />
                </TableCell>
                <TableCell>FILE</TableCell>
                <TableCell>TYPE</TableCell>
                <TableCell>SIZE</TableCell>
                <TableCell>UPLOADED</TableCell>
                <TableCell>USED BY</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((asset) => (
                <TableRow key={asset.publicId} hover selected={selected.has(asset.publicId)}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selected.has(asset.publicId)} onChange={() => toggle(asset.publicId)} slotProps={{ input: { "aria-label": `Select ${asset.publicId}` } }} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography component="a" href={asset.secureUrl} target="_blank" rel="noreferrer" noWrap sx={{ display: "block", fontFamily: monoFont, fontSize: 12, color: "primary.main" }}>
                      {asset.publicId}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                      {asset.isSample && <MiniChip label="sample" color="#64748B" bg="#F1F5F9" />}
                      {asset.inLibrary && <MiniChip label="AV Studio" color="#0369A1" bg="#E0F2FE" />}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {asset.resourceType} · {asset.format}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{formatBytes(asset.bytes)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{new Date(asset.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{asset.usedBy ?? <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>Not used</Typography>}</TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                    No files here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${chosen.length} file(s)?`}
        message={`About ${formatBytes(chosenBytes)} will be permanently deleted from Cloudinary.${chosenInUse ? ` ${chosenInUse} of them are used by lessons and will be removed from those lessons.` : ""} This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={isPending}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
      />
    </Box>
  );
}
