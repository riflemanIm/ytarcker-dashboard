import * as React from "react";
import { IconButton, Tooltip } from "@mui/material";
import DateRangeIcon from "@mui/icons-material/DateRange";
import TodayIcon from "@mui/icons-material/Today";

export interface ToggleViewButtonProps {
  viewMode: "table" | "report";
  onToggle: () => void;
}

/**
 * Кнопка-переключатель представления между TaskTable и WorklogWeeklyReport.
 *
 * - Если `viewMode === "table"` → показываем иконку DateRange (переключение к отчёту).
 * - Если `viewMode === "report"` → показываем иконку Today (переключение к недельной таблице).
 */
export default function ToggleViewButton({
  viewMode,
  onToggle,
}: ToggleViewButtonProps) {
  const tooltip =
    viewMode === "table"
      ? "Показать месячный отчёт по неделям "
      : "Показать таблицу списания в времени за неделю";

  const Icon = viewMode === "table" ? DateRangeIcon : TodayIcon;

  return (
    <Tooltip title={tooltip}>
      <IconButton onClick={onToggle} color="primary">
        <Icon />
      </IconButton>
    </Tooltip>
  );
}
