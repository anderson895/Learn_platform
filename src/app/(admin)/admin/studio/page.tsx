import type { Metadata } from "next";
import PagePlaceholder from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "AV Studio & Recorder" };

export default function StudioPage() {
  return (
    <PagePlaceholder
      sprint={3}
      figure="Fig. 9"
      title="AV Studio & Recorder"
      description="Pag-record at pag-upload ng lesson video o audio sa Cloudinary."
      items={[
        "Camera preview at microphone input level (MediaRecorder)",
        "Start/Stop Recording, at pag-upload ng file",
        "Signed upload sa Cloudinary, may progress indicator",
        "Listahan ng recordings at storage used",
        "Save to Notes Repository at Publish to Syllabus",
      ]}
    />
  );
}
