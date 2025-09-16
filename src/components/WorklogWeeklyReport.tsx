import { Box, Stack, Typography, IconButton } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import * as React from "react";
import {
  clampDateToRange,
  displayDuration,
  enumerateISOWeeks,
  formatWeekLabel,
  normalizeWorklogItem,
  startOfDay,
  startOfISOWeek,
  sumDurations,
  toDate,
  weekKey,
  WorklogItem,
} from "../helpers";
import dayjs from "dayjs";

import "dayjs/locale/ru";

dayjs.locale("ru");
// --- IssueDisplay, как в TaskTable ---
const IssueDisplay: React.FC<{
  display: string;
  href?: string | null;
  fio?: string | null;
}> = ({ display, href = null, fio = null }) => (
  <>
    <Typography variant="subtitle1" sx={{ position: "relative", left: -7 }}>
      {href && (
        <IconButton
          component="a"
          href={href}
          target="_blank"
          sx={(theme) => ({
            borderRadius: "50%",
            color: theme.palette.primary.light,
            "&:hover": {
              color: theme.palette.primary.main,
            },
          })}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      )}
      {display}
    </Typography>
    {fio && (
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ position: "relative", top: -5, left: 30 }}
      >
        {fio}
      </Typography>
    )}
  </>
);

type AnyObj = Record<string, any>;

export interface WorklogWeeklyReportProps {
  from: string | Date;
  to: string | Date;
  data: AnyObj[] | { data: AnyObj[] } | null | undefined;
  height?: number;
}

export default function WorklogWeeklyReport({
  from,
  to,
  data,
  height = 520,
}: WorklogWeeklyReportProps) {
  const inputArray: AnyObj[] = React.useMemo(() => {
    if (!data) return [];
    return Array.isArray(data)
      ? data
      : Array.isArray((data as any).data)
        ? (data as any).data
        : [];
  }, [data]);

  const items: WorklogItem[] = React.useMemo(
    () => inputArray.map(normalizeWorklogItem).filter(Boolean) as WorklogItem[],
    [inputArray]
  );

  const fromD = React.useMemo(() => startOfDay(toDate(from)), [from]);
  const toD = React.useMemo(() => {
    const d = toDate(to);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [to]);

  const weeks = React.useMemo(
    () => enumerateISOWeeks(fromD, toD),
    [fromD, toD]
  );

  const { rows, columns } = React.useMemo(() => {
    const cols: GridColDef[] = [
      {
        field: "issueTitle",
        headerName: "Название",
        flex: 1,
        minWidth: 220,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams) =>
          params.row.id !== "__total__" ? (
            <IssueDisplay
              display={params.value}
              href={`https://tracker.yandex.ru/${params.row.issueKey}`}
              fio={params.row.fio ?? ""}
            />
          ) : (
            <Typography variant="subtitle1">{params.value}</Typography>
          ),
      },
      {
        field: "issueKey",
        headerName: "Key",
        minWidth: 120,
        flex: 0.5,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
    ];

    weeks.forEach((monday) => {
      const key = weekKey(monday);
      cols.push({
        field: key,
        headerName: formatWeekLabel(monday),
        flex: 1,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <span onContextMenu={(e) => e.preventDefault()}>
            {displayDuration(String(params.value ?? "PT0M"))}
          </span>
        ),
        align: "right",
        headerAlign: "right",
        minWidth: 140,
      });
    });

    cols.push({
      field: "total",
      headerName: "Итого",
      flex: 1,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <span onContextMenu={(e) => e.preventDefault()}>
          {displayDuration(String(params.value ?? "PT0M"))}
        </span>
      ),
      align: "right",
      headerAlign: "right",
      minWidth: 120,
    });

    type RowAcc = Record<string, any>;
    const byIssue: Record<string, RowAcc> = {};

    for (const wl of items) {
      const startDate = toDate(wl.start);
      const inRange = clampDateToRange(startDate, fromD, toD);
      if (!inRange) continue;

      const issueKey = wl.issue.key;
      const issueTitle = wl.issue.display || "";
      const wk = weekKey(startOfISOWeek(inRange));

      if (!byIssue[issueKey]) {
        byIssue[issueKey] = {
          id: issueKey,
          issueKey,
          issueTitle,
          fio: wl.fio ?? "",
          total: "PT0M",
        };
      }

      byIssue[issueKey][wk] = sumDurations([
        String(byIssue[issueKey][wk] ?? "PT0M"),
        wl.duration,
      ]);
      byIssue[issueKey].total = sumDurations([
        String(byIssue[issueKey].total),
        wl.duration,
      ]);
    }

    const rows = Object.values(byIssue).map((row) => {
      weeks.forEach((monday) => {
        const key = weekKey(monday);
        if (!(key in row)) row[key] = "PT0M";
      });
      return row;
    });

    if (rows.length) {
      const totalRow: any = {
        id: "__total__",
        issueKey: "",
        issueTitle: "Итого",
      };

      let grandISO = "PT0M";
      weeks.forEach((monday) => {
        const key = weekKey(monday);
        const weekISO = rows.reduce(
          (accISO: string, r: any) =>
            sumDurations([accISO, String(r[key] ?? "PT0M")]),
          "PT0M"
        );
        totalRow[key] = weekISO;
        grandISO = sumDurations([grandISO, weekISO]);
      });

      totalRow.total = grandISO;
      rows.unshift(totalRow);
    }

    return { rows, columns: cols };
  }, [weeks, fromD, toD, items]);

  return (
    <Stack gap={1} sx={{ width: "100%" }}>
      <Typography variant="h5" align="center">
        Месячный отчёт по неделям
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        Период: {dayjs(fromD).format("DD.MM.YYYY")} —{" "}
        {dayjs(toD).format("DD.MM.YYYY")} (Пн–Вс)
      </Typography>
      <Box sx={{ height, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => (r as any).id}
          getRowClassName={(p) => (p.id === "__total__" ? "row-total" : "")}
          disableRowSelectionOnClick
          pageSizeOptions={[50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          sx={{
            "& .row-total": {
              fontWeight: 600,
              bgcolor: (t) => t.palette.action.hover,
            },
            "& .MuiDataGrid-cell": { alignItems: "center" },
          }}
          disableColumnMenu
        />
      </Box>
    </Stack>
  );
}
