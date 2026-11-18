import TopNavShell, { type TopNavLink } from "@/components/layout/TopNavShell";
import { getViewer, requireUser } from "@/lib/auth/session";
import { EvaluationService } from "@/services/EvaluationService";
import { SystemService } from "@/services/SystemService";

export const instant = false;

const links = [
  { label: "Oversight", href: "/oversight" },
  { label: "Announcements", href: "/announcements" },
  { label: "Profile", href: "/profile" },
];

export default async function ChairmanLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["chairman", "admin"]);
  const [viewer, newAnnouncements, evaluationOpen] = await Promise.all([getViewer(user), new SystemService().recentAnnouncementCount(), new EvaluationService().isOpen()]);
  const withBadges = (items: TopNavLink[]) => [
    ...items.map((link) => (link.href === "/announcements" ? { ...link, badge: newAnnouncements } : link)),
    ...(evaluationOpen ? [{ label: "Evaluation", href: "/evaluation" }] : []),
  ];
  return (
    <TopNavShell subtitle="Oversight" links={withBadges(links)} viewer={viewer}>
      {children}
    </TopNavShell>
  );
}
