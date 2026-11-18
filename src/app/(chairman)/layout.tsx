import TopNavShell from "@/components/layout/TopNavShell";

const links = [
  { label: "Oversight", href: "/oversight" },
  { label: "Announcements", href: "/announcements" },
];

export default function ChairmanLayout({ children }: { children: React.ReactNode }) {
  return (
    <TopNavShell subtitle="Oversight" links={links}>
      {children}
    </TopNavShell>
  );
}
