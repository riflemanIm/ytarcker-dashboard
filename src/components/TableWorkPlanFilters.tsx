import {
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { FC } from "react";
import { useTablePlanContext } from "@/context/TablePlanContext";
import { getPriorityPalette, PriorityKey } from "@/helpers/priorityStyles";
import FilterTableText from "./FilterTableText";

const TableWorkPlanFilters: FC = () => {
  const {
    state: { filterText, filterPriority, filterNotWorkDone },
    dispatch,
    loading,
    rows,
  } = useTablePlanContext();
  const disabled = loading || rows.length === 0;

  const getPriorityLabel = (priority: string) => {
    if (priority === "Green") return "Тривиальный";
    if (priority === "Orange") return "Важный";
    if (priority === "Red") return "Критический";
    return "Все";
  };

  const getPriorityItemSx = (priority: PriorityKey) => (theme: Theme) => ({
    backgroundColor: getPriorityPalette(theme)[priority].main,
    color: getPriorityPalette(theme)[priority].text,
    "&:hover": {
      backgroundColor: getPriorityPalette(theme)[priority].hover,
    },
    "&.Mui-selected": {
      backgroundColor: getPriorityPalette(theme)[priority].main,
    },
    "&.Mui-selected:hover": {
      backgroundColor: getPriorityPalette(theme)[priority].hover,
    },
  });

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <FilterTableText
        value={filterText}
        onChange={(value) => dispatch({ type: "setFilter", value })}
        label="Фильтр"
        placeholder="Название, Key, Работа, Проект, Сотрудник, Статус, Комментарий"
        disabled={disabled}
      />

      <TextField
        select
        size="small"
        margin="dense"
        label="Приоритет"
        value={filterPriority}
        onChange={(event) =>
          dispatch({ type: "setFilterPriority", value: event.target.value })
        }
        disabled={disabled}
        sx={(theme) => {
          if (
            filterPriority !== "Green" &&
            filterPriority !== "Orange" &&
            filterPriority !== "Red"
          ) {
            return { minWidth: { xs: "100%", sm: 180 } };
          }

          const palette = getPriorityPalette(theme)[filterPriority];
          return {
            minWidth: { xs: "100%", sm: 180 },
            "& .MuiOutlinedInput-root": {
              backgroundColor: palette.main,
              color: palette.text,
            },
          };
        }}
        SelectProps={{
          renderValue: (value) => getPriorityLabel(String(value)),
        }}
      >
        <MenuItem value="">Все</MenuItem>
        <MenuItem value="Green" sx={getPriorityItemSx("Green")}>
          Тривиальный
        </MenuItem>
        <MenuItem value="Orange" sx={getPriorityItemSx("Orange")}>
          Важный
        </MenuItem>
        <MenuItem value="Red" sx={getPriorityItemSx("Red")}>
          Критический
        </MenuItem>
      </TextField>
      <FormControlLabel
        control={
          <Switch
            checked={filterNotWorkDone}
            onChange={(_, checked) =>
              dispatch({ type: "setFilterNotWorkDone", value: checked })
            }
            disabled={disabled}
          />
        }
        label="НЕ выполненные"
        sx={{ mx: 0, whiteSpace: "nowrap" }}
      />
    </Stack>
  );
};

export default TableWorkPlanFilters;
