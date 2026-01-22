import { alpha, type Theme } from "@mui/material/styles";

export type PriorityKey = "Green" | "Orange" | "Red";

export const getPriorityPalette = (theme: Theme) => ({
  Green: {
    main: alpha(theme.palette.success.light, 0.2),
    hover: alpha(theme.palette.success.main, 0.4),
    text: theme.palette.getContrastText(theme.palette.success.main),
  },
  Orange: {
    main: alpha(theme.palette.warning.light, 0.4),
    hover: alpha(theme.palette.warning.main, 0.6),
    text: theme.palette.getContrastText(theme.palette.warning.main),
  },
  Red: {
    main: alpha(theme.palette.error.light, 0.3),
    hover: alpha(theme.palette.error.main, 0.5),
    text: theme.palette.getContrastText(theme.palette.error.main),
  },
});
