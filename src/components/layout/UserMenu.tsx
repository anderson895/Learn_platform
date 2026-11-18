"use client";

import { useState } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import { logoutAction } from "@/app/(auth)/actions";
import type { Viewer } from "@/lib/auth/session";

export type UserMenuItem = { label: string; href: string; icon?: React.ReactNode };

const ROLE_LABEL = { student: "Student", admin: "Educator", chairman: "Chairman" } as const;

/** Dropdown ng naka-login na user (pangalan at avatar): mga link ng account at Sign Out. */
export default function UserMenu({ viewer, items }: { viewer: Viewer; items: UserMenuItem[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const close = () => setAnchor(null);

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${viewer.displayName}`}
        sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, borderRadius: "10px", "&:hover": { bgcolor: "action.hover" } }}
      >
        <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>{viewer.displayName.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left", lineHeight: 1.1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{viewer.displayName}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{ROLE_LABEL[viewer.role]}</Typography>
        </Box>
        <KeyboardArrowDownRounded sx={{ fontSize: 18, color: "text.secondary", transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }} />
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, minWidth: 220, borderRadius: "12px", border: 1, borderColor: "divider", boxShadow: "0 10px 30px rgba(15,23,42,0.12)" } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{viewer.displayName}</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{viewer.email}</Typography>
        </Box>
        <Divider />
        {items.map((item) => (
          <MenuItem key={item.href} component={NextLink} href={item.href} onClick={close} sx={{ fontSize: 14, py: 1 }}>
            {item.icon && <ListItemIcon sx={{ "& svg": { fontSize: 18 } }}>{item.icon}</ListItemIcon>}
            {item.label}
          </MenuItem>
        ))}
        {items.length > 0 && <Divider />}
        <Box component="form" action={logoutAction}>
          <MenuItem component="button" type="submit" sx={{ width: "100%", fontSize: 14, py: 1, color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit", "& svg": { fontSize: 18 } }}>
              <LogoutOutlined />
            </ListItemIcon>
            Sign Out
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
}
