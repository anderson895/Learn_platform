"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";

export default function LinkCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardActionArea component={NextLink} href={href} sx={{ p: 2 }}>
        <Box sx={{ mb: 1 }}>{icon}</Box>
        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </CardActionArea>
    </Card>
  );
}
