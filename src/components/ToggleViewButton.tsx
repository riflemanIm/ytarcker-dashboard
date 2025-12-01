import DateRangeIcon from "@mui/icons-material/DateRange";
import SearchIcon from "@mui/icons-material/Search";
import TodayIcon from "@mui/icons-material/Today";
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import * as React from "react";
import { ViewMode } from "../types/global";

export interface ToggleViewButtonProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

type IconComponent = typeof TodayIcon;

const VIEW_MODE_OPTIONS: Record<
  ViewMode,
  { icon: IconComponent; tooltip: string; menuLabel: string }
> = {
  table: {
    icon: TodayIcon,
    tooltip: "Показать таблицу списания времени за неделю",
    menuLabel: "Таблица списания",
  },
  report: {
    icon: DateRangeIcon,
    tooltip: "Показать месячный отчёт по неделям",
    menuLabel: "Месячный отчёт",
  },
  search: {
    icon: SearchIcon,
    tooltip: "Перейти в поиск по задачам",
    menuLabel: "Поиск по задачам",
  },
};

const VIEW_MODE_ORDER: ViewMode[] = ["table", "report", "search"];

/**
 * Кнопка-переключатель представления между TaskTable, WorklogWeeklyReport и SearchIssues.
 */
export default function ToggleViewButton({
  viewMode,
  onChange,
}: ToggleViewButtonProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const currentOption = VIEW_MODE_OPTIONS[viewMode];
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
        {currentOption.menuLabel}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {VIEW_MODE_ORDER.map((mode) => {
          const OptionIcon = VIEW_MODE_OPTIONS[mode].icon;
          return (
            <MenuItem
              key={mode}
              selected={mode === viewMode}
              onClick={() => handleSelect(mode)}
            >
              <ListItemIcon>
                <OptionIcon fontSize="medium" />
              </ListItemIcon>
              <ListItemText primary={VIEW_MODE_OPTIONS[mode].menuLabel} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
