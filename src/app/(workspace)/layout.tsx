import { requireUser } from "@/lib/auth/session";

// Full-screen na layout ng Student Workspace (Figs. 13-14), walang top navigation.
export const instant = false;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["student", "admin"]);
  return children;
}
