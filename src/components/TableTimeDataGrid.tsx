import { Paper } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRowClassNameParams,
  GridValidRowModel,
} from "@mui/x-data-grid";
import type { ComponentProps } from "react";

type TableTimeDataGridProps<T extends GridValidRowModel> = {
  rows: readonly T[];
  columns: GridColDef[];
  loading?: boolean;
  onCellClick?: ComponentProps<typeof DataGrid>["onCellClick"];
  processRowUpdate?: ComponentProps<typeof DataGrid>["processRowUpdate"];
  getRowClassName?: (params: GridRowClassNameParams) => string;
};

const TableTimeDataGrid = <T extends GridValidRowModel>({
  rows,
  columns,
  loading = false,
  onCellClick,
  processRowUpdate,
  getRowClassName,
}: TableTimeDataGridProps<T>) => (
  <Paper
    variant="elevation"
    sx={(theme) => ({
      p: { xs: 1, sm: 2 },
      borderRadius: { xs: 1, sm: 2 },
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.04)",
    })}
  >
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      disableColumnMenu
      pageSizeOptions={[15]}
      onCellClick={onCellClick}
      processRowUpdate={processRowUpdate}
      getRowClassName={getRowClassName}
      sx={{
        "& .no-hover:hover": { backgroundColor: "transparent !important" },
        "& .current-column-header": {
          backgroundColor: "rgba(200, 220, 255, 0.5)",
        },
        "& .current-column-cell": {
          backgroundColor: "rgba(200, 230, 255, 0.2)",
        },
        height: "81vh",
      }}
    />
  </Paper>
);

export default TableTimeDataGrid;
