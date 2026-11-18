import { createTheme } from "@mui/material/styles";
import { brand, sansFont } from "./tokens";

/** MUI theme. Ginagamit lang ng ThemeRegistry (client). Ang mga kulay ay nasa `tokens.ts`. */
const theme = createTheme({
  palette: {
    primary: { main: brand.sky, contrastText: "#FFFFFF" },
    secondary: { main: brand.ink, contrastText: "#FFFFFF" },
    success: { main: "#10B981", contrastText: "#FFFFFF" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    background: { default: "#EFF3F7", paper: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#64748B" },
    divider: "#E2E8F0",
  },
  typography: {
    fontFamily: sansFont,
    button: { textTransform: "none", fontWeight: 600 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: "0.06em" },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: "1px solid #E2E8F0", borderRadius: 12 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
});

export default theme;
