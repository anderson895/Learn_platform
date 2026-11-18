"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import SpaceDashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import BrandLogo from "@/components/brand/BrandLogo";
import UserMenu, { type UserMenuItem } from "@/components/layout/UserMenu";
import type { Viewer } from "@/lib/auth/session";

export type TopNavLink = { label: string; href: string; badge?: number };

/** Mga link sa dropdown ng user, ayon sa role. */
const menuItems: Record<Viewer["role"], UserMenuItem[]> = {
  student: [
    { label: "Profile", href: "/profile", icon: <PersonOutlined /> },
    { label: "Achievements", href: "/achievements", icon: <EmojiEventsOutlined /> },
  ],
  admin: [
    { label: "My Account", href: "/admin/account", icon: <AccountCircleOutlined /> },
    { label: "Content Studio", href: "/admin", icon: <SpaceDashboardOutlined /> },
  ],
  chairman: [{ label: "Profile", href: "/profile", icon: <PersonOutlined /> }],
};

/** Layout ng Student at Chairman: top bar na may logo at mga link. */
export default function TopNavShell({
  subtitle,
  links,
  viewer,
  children,
}: {
  subtitle: string;
  links: TopNavLink[];
  viewer: Viewer;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        component="header"
        className="no-print"
        sx={{
          px: { xs: 2, md: 3 },
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <BrandLogo subtitle={subtitle} tone="light" />
        <Box component="nav" sx={{ display: "flex", gap: 0.5, ml: { md: 3 }, flexWrap: "wrap" }}>
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button
                key={link.href}
                component={NextLink}
                href={link.href}
                size="small"
                color={active ? "primary" : "inherit"}
                sx={{ fontWeight: active ? 700 : 500, color: active ? undefined : "text.secondary" }}
              >
                {link.badge ? (
                  <Badge badgeContent={link.badge} color="error" max={9} sx={{ "& .MuiBadge-badge": { right: -10, top: 2 } }}>
                    {link.label}
                  </Badge>
                ) : (
                  link.label
                )}
              </Button>
            );
          })}
        </Box>
        <Box sx={{ flex: 1 }} />
        <UserMenu viewer={viewer} items={menuItems[viewer.role]} />
      </Box>
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        {children}
      </Box>
    </Box>
  );
}
