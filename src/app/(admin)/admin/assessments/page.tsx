import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessmentsPage() {
  return (
    <PagePlaceholder
      sprint={5}
      title="Assessment Builder"
      description="Create Activities, Create Quizzes at Create Assignments (Dual Assessment)."
      items={[
        "Code Sequencing Activity: mga block at tamang order (Sprint 4)",
        "Coding Exercise/Assignment: instructions, starter code at max score (Sprint 4)",
        "Syntax Reviewer at Summative Quiz: multiple-choice, time limit at threshold (Sprint 5)",
        "Nakatago ang mga sagot sa answerKeys",
      ]}
    />
  );
}
