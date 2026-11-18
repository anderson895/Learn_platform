import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <PagePlaceholder
      sprint={7}
      title="Reports"
      description="Report Management (Fig. 5)."
      items={["Student Progress Reports", "Assessment Reports", "Performance Reports", "Export sa CSV o PDF"]}
    />
  );
}
