import DateRangeIcon from "@mui/icons-material/DateRange";
import EventNoteIcon from "@mui/icons-material/EventNote";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import TodayIcon from "@mui/icons-material/Today";
import {
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  PaletteMode,
  Switch,
  Typography,
} from "@mui/material";
import * as React from "react";
import { ViewMode } from "../types/global";

export interface ToggleViewButtonProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  isAdmin: boolean;
  planEditMode: boolean;
  login?: string | null;
  showLogout?: boolean;
  onLogout?: () => void;
  paletteMode: PaletteMode;
  onTogglePaletteMode: (mode: PaletteMode) => void;
  useSystemTheme: boolean;
  onToggleUseSystemTheme: (enabled: boolean) => void;
}

type IconComponent = typeof TodayIcon;

const VIEW_MODE_OPTIONS: Array<{
  mode: ViewMode;
  icon: IconComponent;
  tooltip: string;
  menuLabel: string;
  access?: (params: { isAdmin: boolean; planEditMode: boolean }) => boolean;
}> = [
  {
    mode: "table_time_spend",
    icon: TodayIcon,
    tooltip: "Показать таблицу списания времени за неделю",
    menuLabel: "Списания",
    access: ({ planEditMode }) => !planEditMode,
  },
  {
    mode: "table_time_plan",
    icon: EventNoteIcon,
    tooltip: "Показать планирования времени",
    menuLabel: "Планирование",
    access: () => true,
  },
  {
    mode: "report",
    icon: DateRangeIcon,
    tooltip: "Показать месячный отчёт по неделям",
    menuLabel: "Месячный отчёт",
    access: ({ isAdmin }) => isAdmin,
  },
  {
    mode: "search",
    icon: SearchIcon,
    tooltip: "Перейти в поиск по задачам",
    menuLabel: "Поиск по задачам",
    access: () => true,
  },
];

/**
 * Кнопка-переключатель представления между TableTimeSpend, WorklogWeeklyReport и SearchIssues.
 */
export default function ToggleViewButton({
  viewMode,
  onChange,
  isAdmin,
  planEditMode,
  login,
  showLogout = false,
  onLogout,
  paletteMode,
  onTogglePaletteMode,
  useSystemTheme,
  onToggleUseSystemTheme,
}: ToggleViewButtonProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (planEditMode && viewMode === "table_time_spend") {
      onChange("table_time_plan");
    }
  }, [planEditMode, viewMode, onChange]);

  const currentOption =
    VIEW_MODE_OPTIONS.find((option) => option.mode === viewMode) ||
    VIEW_MODE_OPTIONS[0];
  const Icon = currentOption.icon;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (mode: ViewMode) => {
    onChange(mode);
    handleClose();
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        startIcon={<Icon style={{ fontSize: 30 }} />}
        sx={(theme) => ({
          borderRadius: 2.5,
          px: 2.5,
          py: 1.25,
          minWidth: 190,
          textTransform: "none",
          fontWeight: 500,
          fontSize: 15,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
          color: theme.palette.getContrastText(theme.palette.primary.main),
          boxShadow: "0px 8px 18px rgba(25, 118, 210, 0.25)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            color: "#fff",
            transform: "translateY(-2px)",
            boxShadow: "0px 12px 24px rgba(25, 118, 210, 0.35)",
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
          },
        })}
      >
        <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span>{currentOption.menuLabel}</span>
          {login && (
            <Typography
              component="span"
              variant="caption"
              sx={{ color: "inherit" }}
            >
              {login}
            </Typography>
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {VIEW_MODE_OPTIONS.filter((option) => {
          if (!option.access) return true;
          return option.access({
            isAdmin,
            planEditMode,
          });
        }).map((option) => {
          const OptionIcon = option.icon;
          return (
            <MenuItem
              key={option.mode}
              selected={option.mode === viewMode}
              onClick={() => handleSelect(option.mode)}
            >
              <ListItemIcon>
                <OptionIcon fontSize="medium" />
              </ListItemIcon>
              <ListItemText primary={option.menuLabel} />
            </MenuItem>
          );
        })}
        {showLogout && onLogout && <Divider />}
        {showLogout && onLogout && (
          <MenuItem
            disableRipple
            onClick={(event) => {
              event.preventDefault();
            }}
            sx={{
              cursor: "default",
              "&.MuiMenuItem-root:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            <ListItemText primary="Системная тема" />
            <Switch
              edge="end"
              checked={useSystemTheme}
              onChange={(event) => {
                event.stopPropagation();
                onToggleUseSystemTheme(event.target.checked);
              }}
              onClick={(event) => event.stopPropagation()}
              color="primary"
            />
          </MenuItem>
        )}
        {showLogout && onLogout && (
          <MenuItem
            disableRipple
            onClick={(event) => {
              event.preventDefault();
            }}
            sx={{
              cursor: "default",
              "&.MuiMenuItem-root:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            <ListItemText primary="Тёмная тема" />
            <Switch
              edge="end"
              checked={paletteMode === "dark"}
              disabled={useSystemTheme}
              onChange={(event) => {
                event.stopPropagation();
                onTogglePaletteMode(
                  paletteMode === "dark" ? "light" : "dark",
                );
              }}
              onClick={(event) => event.stopPropagation()}
              color="primary"
            />
          </MenuItem>
        )}
        {showLogout && onLogout && (
          <MenuItem
            onClick={() => {
              handleClose();
              onLogout();
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="medium" />
            </ListItemIcon>
            <ListItemText primary="Выйти" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
