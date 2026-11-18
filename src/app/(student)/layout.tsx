import TopNavShell from "@/components/layout/TopNavShell";

const links = [
  { label: "Syllabus Board", href: "/learn" },
  { label: "Achievements", href: "/achievements" },
  { label: "Announcements", href: "/announcements" },
  { label: "Profile", href: "/profile" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <TopNavShell subtitle="Workspace" links={links}>
      {children}
    </TopNavShell>
  );
}
