"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { logoutAction } from "@/app/(auth)/actions";
import BrandLogo from "@/components/brand/BrandLogo";
import type { Viewer } from "@/lib/auth/session";
import Typography from "@mui/material/Typography";

export type TopNavLink = { label: string; href: string; badge?: number };

/** Layout ng Student at Chairman: top bar na may logo at mga link. */
const roleLabel = { student: "Student", admin: "Educator", chairman: "Chairman" } as const;

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>
            {viewer.displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{viewer.displayName}</Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{roleLabel[viewer.role]}</Typography>
          </Box>
          <Box component="form" action={logoutAction}>
            <Button type="submit" size="small" color="inherit" sx={{ color: "text.secondary" }}>
              Sign Out
            </Button>
          </Box>
        </Box>
      </Box>
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        {children}
      </Box>
    </Box>
  );
}
