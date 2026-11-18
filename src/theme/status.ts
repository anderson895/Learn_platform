/** Color-Coded Progress Monitoring (Objective 2.8). */
export type LessonStatus = "locked" | "not_started" | "in_progress" | "completed" | "below_threshold";

export const statusStyles: Record<LessonStatus, { label: string; color: string; bg: string }> = {
  locked: { label: "Locked", color: "#94A3B8", bg: "#F1F5F9" },
  not_started: { label: "Not Started", color: "#64748B", bg: "#F1F5F9" },
  in_progress: { label: "In Progress", color: "#D97706", bg: "#FEF3C7" },
  completed: { label: "Completed", color: "#059669", bg: "#D1FAE5" },
  below_threshold: { label: "Below Threshold", color: "#DC2626", bg: "#FEE2E2" },
};
