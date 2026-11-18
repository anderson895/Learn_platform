import { Suspense } from "react";
import type { Metadata } from "next";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import MiniChip from "@/components/ui/MiniChip";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ProgressService, type RosterRow } from "@/services/ProgressService";
import { monoFont } from "@/theme/tokens";

export const metadata: Metadata = { title: "Class Roster" };

const STATUS: Record<RosterRow["status"], { color: string; bg: string }> = {
  active: { color: "#0369A1", bg: "#E0F2FE" },
  completed: { color: "#059669", bg: "#D1FAE5" },
  inactive: { color: "#64748B", bg: "#F1F5F9" },
};

/** Class Roster (Fig. 12): progress ng bawat student. */
export default function RosterPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RosterContent />
    </Suspense>
  );
}

async function RosterContent() {
  await requireUser(["admin"]);
  const rows = (await new ProgressService().roster()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  return (
    <Card>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5 }}>
        <PeopleOutlined fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography sx={{ fontWeight: 600 }}>Class Roster — Computer Programming 1</Typography>
        <MiniChip label={`${rows.filter((row) => row.accountStatus === "active").length} enrolled`} color="#475569" bg="#F1F5F9" />
      </Box>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#F8FAFC", "& th": { fontSize: 11, fontWeight: 600, color: "text.secondary", letterSpacing: "0.05em" } }}>
              <TableCell>STUDENT</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>PROGRESS</TableCell>
              <TableCell>AVG. QUIZ</TableCell>
              <TableCell>STATUS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.uid} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: "primary.main" }}>{row.fullName.charAt(0)}</Avatar>
                    <Typography sx={{ fontSize: 13.5 }}>{row.fullName}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontFamily: monoFont, fontSize: 12, color: "primary.main" }}>{row.studentNumber}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, maxWidth: 220 }}>
                    <LinearProgress
                      variant="determinate"
                      value={row.percent}
                      aria-label={`${row.fullName} progress`}
                      sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: row.percent === 100 ? "success.main" : "primary.main" } }}
                    />
                    <Typography sx={{ fontSize: 12, color: "text.secondary", width: 76 }}>
                      {row.percent}% ({row.completed}/{row.total})
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{row.averageQuizScore === null ? "—" : `${row.averageQuizScore}%`}</TableCell>
                <TableCell>
                  <MiniChip label={row.status} color={STATUS[row.status].color} bg={STATUS[row.status].bg} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                  No students yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
