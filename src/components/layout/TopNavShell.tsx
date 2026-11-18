"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import BrandLogo from "@/components/brand/BrandLogo";

export type TopNavLink = { label: string; href: string };

/** Layout ng Student at Chairman: top bar na may logo at mga link. */
export default function TopNavShell({
  subtitle,
  links,
  children,
}: {
  subtitle: string;
  links: TopNavLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        component="header"
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
                {link.label}
              </Button>
            );
          })}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button component={NextLink} href="/login" size="small" color="inherit" sx={{ color: "text.secondary" }}>
          Sign Out
        </Button>
        <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>S</Avatar>
      </Box>
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        {children}
      </Box>
    </Box>
  );
}
