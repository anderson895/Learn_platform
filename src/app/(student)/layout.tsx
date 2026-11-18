import TopNavShell, { type TopNavLink } from "@/components/layout/TopNavShell";
import { getViewer, requireUser } from "@/lib/auth/session";
import { SystemService } from "@/services/SystemService";

export const instant = false;

const linksByRole: Record<"student" | "admin" | "chairman", TopNavLink[]> = {
  student: [
    { label: "Syllabus Board", href: "/learn" },
    { label: "Achievements", href: "/achievements" },
    { label: "Announcements", href: "/announcements" },
    { label: "Profile", href: "/profile" },
  ],
  admin: [
    { label: "Content Studio", href: "/admin" },
    { label: "Syllabus Board", href: "/learn" },
    { label: "Announcements", href: "/announcements" },
  ],
  chairman: [
    { label: "Oversight", href: "/oversight" },
    { label: "Announcements", href: "/announcements" },
    { label: "Profile", href: "/profile" },
  ],
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["student", "admin", "chairman"]);
  const [viewer, newAnnouncements] = await Promise.all([getViewer(user), new SystemService().recentAnnouncementCount()]);
  const withBadges = (items: TopNavLink[]) => items.map((link) => (link.href === "/announcements" ? { ...link, badge: newAnnouncements } : link));
  const subtitle = user.role === "student" ? "Workspace" : user.role === "admin" ? "Student View" : "Oversight";
  return (
    <TopNavShell subtitle={subtitle} links={withBadges(linksByRole[user.role])} viewer={viewer}>
      {children}
    </TopNavShell>
  );
}
