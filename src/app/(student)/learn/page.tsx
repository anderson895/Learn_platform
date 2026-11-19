import { Suspense } from "react";
import type { Metadata } from "next";
import SyllabusBoard from "@/components/progress/SyllabusBoard";
import PageLoading from "@/components/ui/PageLoading";
import { requireUser } from "@/lib/auth/session";
import { ContentService } from "@/services/ContentService";
import { ProgressService } from "@/services/ProgressService";

export const metadata: Metadata = { title: "Syllabus Board" };

type Props = { searchParams: Promise<{ locked?: string }> };

/** Syllabus Progress Board (Fig. 15). */
export default function SyllabusBoardPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageLoading rows={6} />}>
      <BoardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BoardContent({ searchParams }: Props) {
  const user = await requireUser(["student", "admin"]);
  const [{ locked }, board, course] = await Promise.all([searchParams, new ProgressService().board(user.id), new ContentService().getCourse()]);
  const { subjectCode, subjectName, yearLevel, academicYear, courseDescription, courseObjectives, learningOutcomes } = course;
  return (
    <SyllabusBoard
      board={board}
      course={{ subjectCode, subjectName, yearLevel, academicYear, courseDescription, courseObjectives, learningOutcomes }}
      locked={locked === "1"}
      preview={user.role !== "student"}
    />
  );
}
