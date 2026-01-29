import { TaskPlanInfoItem } from "@/types/global";
import { Box, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { FC, useMemo } from "react";
import { workMinutesToDurationInput } from "@/helpers";

interface TableTaskPlanInfoProps {
  rows: TaskPlanInfoItem[];
  loading?: boolean;
}

const TableTaskPlanInfo: FC<TableTaskPlanInfoProps> = ({
  rows,
  loading = false,
}) => {
  const columns = useMemo<GridColDef<TaskPlanInfoItem>[]>(
    () => [
      {
        field: "SprintLabel",
        headerName: "Спринт",
        minWidth: 140,
        flex: 1,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: "CheckListAssignee",
        headerName: "Исполнитель",
        minWidth: 180,
        flex: 1,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: "WorkName",
        headerName: "Работа",
        minWidth: 160,
        flex: 1,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: "WorkDone",
        headerName: "Готово",
        minWidth: 90,
        flex: 0.6,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        valueFormatter: (value: TaskPlanInfoItem["WorkDone"]) =>
          value ? "Да" : "Нет",
      },
      {
        field: "Deadline",
        headerName: "Дедлайн",
        minWidth: 110,
        flex: 0.8,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        valueFormatter: (value: TaskPlanInfoItem["Deadline"]) =>
          value && dayjs(value).isValid()
            ? dayjs(value).format("DD.MM.YYYY")
            : "-",
      },
      {
        field: "EstimateTimeMinutes",
        headerName: "Оценка",
        minWidth: 110,
        flex: 0.7,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        valueFormatter: (value: TaskPlanInfoItem["EstimateTimeMinutes"]) =>
          workMinutesToDurationInput(value) || "0m",
      },
      {
        field: "SpentTimeMinutes",
        headerName: "Затрачено",
        minWidth: 110,
        flex: 0.7,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        valueFormatter: (value: TaskPlanInfoItem["SpentTimeMinutes"]) =>
          workMinutesToDurationInput(value) || "0m",
      },
      {
        field: "RemainTimeMinutes",
        headerName: "Осталось",
        minWidth: 110,
        flex: 0.7,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        valueFormatter: (value: TaskPlanInfoItem["RemainTimeMinutes"]) =>
          workMinutesToDurationInput(value) || "0m",
      },
      {
        field: "Hint",
        headerName: "Комментарий",
        minWidth: 160,
        flex: 1,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
    ],
    [],
  );

  const rowsWithId = useMemo(
    () =>
      rows.map((item, index) => ({
        ...item,
        id: `${item.SprintLabel}_${item.CheckListAssignee}_${item.WorkName}_${index}`,
      })),
    [rows],
  );

  return (
    <Box sx={{ height: 420, width: "100%" }}>
      {rowsWithId.length === 0 && !loading ? (
        <Typography variant="body2" color="text.secondary">
          Нет данных планирования
        </Typography>
      ) : null}
      <DataGrid
        rows={rowsWithId}
        columns={columns}
        loading={loading}
        pageSizeOptions={[10, 20, 50]}
        disableColumnMenu
      />
    </Box>
  );
};

export default TableTaskPlanInfo;
