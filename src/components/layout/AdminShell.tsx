"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import AssignmentTurnedInOutlined from "@mui/icons-material/AssignmentTurnedInOutlined";
import ChevronRight from "@mui/icons-material/ChevronRight";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import NavigateNext from "@mui/icons-material/NavigateNext";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import QuizOutlined from "@mui/icons-material/QuizOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SpaceDashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import ViewListOutlined from "@mui/icons-material/ViewListOutlined";
import BrandLogo from "@/components/brand/BrandLogo";
import { brand } from "@/theme/tokens";

type NavItem = { label: string; href: string; icon: SvgIconComponent };

/** Ang unang 5 ay galing sa sidebar ng Figs. 8-12. Ang "Management" ay ang mga screen na idinagdag. */
const contentNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: SpaceDashboardOutlined },
  { label: "AV Studio & Recorder", href: "/admin/studio", icon: VideocamOutlined },
  { label: "Notes Repository", href: "/admin/notes", icon: DescriptionOutlined },
  { label: "Syllabus Builder", href: "/admin/syllabus", icon: MenuBookOutlined },
  { label: "Class Roster", href: "/admin/roster", icon: PeopleOutlined },
];

const managementNav: NavItem[] = [
  { label: "Student Accounts", href: "/admin/students", icon: ManageAccountsOutlined },
  { label: "Assessments", href: "/admin/assessments", icon: QuizOutlined },
  { label: "Submissions", href: "/admin/submissions", icon: AssignmentTurnedInOutlined },
  { label: "Reports", href: "/admin/reports", icon: AssessmentOutlined },
  { label: "Settings", href: "/admin/settings", icon: SettingsOutlined },
];

const DRAWER_WIDTH = 248;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <ListItemButton
      component={NextLink}
      href={item.href}
      onClick={onClick}
      selected={active}
      sx={{
        borderRadius: "8px",
        mb: 0.25,
        py: 0.75,
        color: "#CBD5E1",
        "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "rgba(14,165,233,0.14)", color: "primary.main" },
        "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
        <Icon sx={{ fontSize: 18 }} />
      </ListItemIcon>
      <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 13.5 } } }} />
      {active && <ChevronRight sx={{ fontSize: 16 }} />}
    </ListItemButton>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  const current = [...contentNav, ...managementNav].find((item) => isActive(pathname, item.href));

  const subheader = (label: string) => (
    <ListSubheader
      disableSticky
      sx={{ bgcolor: "transparent", color: brand.muted, fontSize: 11, lineHeight: "28px", letterSpacing: "0.06em" }}
    >
      {label}
    </ListSubheader>
  );

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: brand.navy }}>
      <Box sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${brand.navyBorder}` }}>
        <BrandLogo subtitle="Content Studio" />
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 1.5 }}>
        <List disablePadding>
          {contentNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={close} />
          ))}
        </List>
        <List disablePadding subheader={subheader("MANAGEMENT")} sx={{ mt: 1.5 }}>
          {managementNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={close} />
          ))}
        </List>
      </Box>
      <List disablePadding sx={{ px: 1, py: 1, borderTop: `1px solid ${brand.navyBorder}` }}>
        <NavLink item={{ label: "View Syllabus Board", href: "/learn", icon: ViewListOutlined }} active={false} />
        <NavLink item={{ label: "Sign Out", href: "/login", icon: LogoutOutlined }} active={false} />
      </List>
    </Box>
  );

  const paperSx = { width: DRAWER_WIDTH, border: 0 };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={close}
          sx={{ display: { xs: "block", md: "none" } }}
          slotProps={{ paper: { sx: paperSx } }}
        >
          {drawer}
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: "none", md: "block" } }} slotProps={{ paper: { sx: paperSx } }}>
          {drawer}
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box
          component="header"
          sx={{
            height: 56,
            px: { xs: 1, md: 3 },
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <IconButton aria-label="Buksan ang menu" onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, minWidth: 0 }}>
            <Link component={NextLink} href="/admin" underline="hover" color="text.secondary" sx={{ fontSize: 13 }}>
              Dashboard
            </Link>
            <Typography color="text.primary" noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
              {current && current.href !== "/admin" ? current.label : "Overview"}
            </Typography>
          </Breadcrumbs>
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" aria-label="Notifications">
            <NotificationsNoneOutlined fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="Settings" component={NextLink} href="/admin/settings">
            <SettingsOutlined fontSize="small" />
          </IconButton>
          <Avatar sx={{ width: 30, height: 30, ml: 0.5, bgcolor: "primary.main", fontSize: 13 }}>A</Avatar>
        </Box>
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
