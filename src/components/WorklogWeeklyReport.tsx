import { Box, Stack, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import * as React from "react";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ru";

import {
  displayDuration,
  normalizeWorklogItem,
  sumDurations,
  WorklogItem,
  // ⬇️ обязательно импортируй этот хелпер из helpers (как делали в TaskTable)
  toTarget,
} from "../helpers";
import IssueDisplay from "./IssueDisplay";

dayjs.locale("ru");

type AnyObj = Record<string, any>;

export interface WorklogWeeklyReportProps {
  from: string | Date;
  to: string | Date;
  data: AnyObj[] | { data: AnyObj[] } | null | undefined;
  height?: number;
}

// утилиты именно для этой таблицы (в целевом поясе)
const weekKeyTz = (monday: Dayjs) => monday.format("YYYY-MM-DD"); // ключ недели
const formatWeekLabelTz = (monday: Dayjs) => {
  const sunday = monday.add(6, "day");
  const dd = (n: number) => String(n).padStart(2, "0");
  const monShort = monday.format("MMM"); // локаль ru
  return `W${monday.isoWeek()} (${dd(monday.date())}–${dd(sunday.date())} ${monShort})`;
};

export default function WorklogWeeklyReport({
  from,
  to,
  data,
  height = 520,
}: WorklogWeeklyReportProps) {
  // 1) распаковываем массив
  const inputArray: AnyObj[] = React.useMemo(() => {
    if (!data) return [];
    return Array.isArray(data)
      ? data
      : Array.isArray((data as any).data)
        ? (data as any).data
        : [];
  }, [data]);

  // 2) нормализуем в WorklogItem (оставляем start как есть — со своим оффсетом)
  const items: WorklogItem[] = React.useMemo(
    () => inputArray.map(normalizeWorklogItem).filter(Boolean) as WorklogItem[],
    [inputArray]
  );

  // 3) границы периода в целевом поясе (Пн 00:00:00 — Вс 23:59:59)
  const fromT = React.useMemo(() => toTarget(from).startOf("isoWeek"), [from]);
  const toT = React.useMemo(() => toTarget(to).endOf("isoWeek"), [to]);

  // 4) список понедельников (в целевом поясе)
  const weeks = React.useMemo(() => {
    const arr: Dayjs[] = [];
    let cur = fromT.clone().startOf("isoWeek");
    const last = toT.clone().endOf("isoWeek");
    while (cur.isSameOrBefore(last)) {
      arr.push(cur.clone());
      cur = cur.add(1, "week");
    }
    return arr;
  }, [fromT, toT]);

  // 5) строим колонки и строки
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
      const key = weekKeyTz(monday);
      cols.push({
        field: key,
        headerName: formatWeekLabelTz(monday),
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

    // ⚡️ ВАЖНО: для каждой записи используем её родной оффсет, но
    // переводим в целевой пояс перед определением недели
    for (const wl of items) {
      const d = toTarget(wl.start); // момент в целевом поясе
      if (d.isBefore(fromT) || d.isAfter(toT)) continue; // вне диапазона

      const issueKey = wl.issue.key;
      const issueTitle = wl.issue.display || "";
      const wk = weekKeyTz(d.startOf("isoWeek"));

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
        const key = weekKeyTz(monday);
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
        const key = weekKeyTz(monday);
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
  }, [weeks, fromT, toT, items]);

  return (
    <Stack gap={1} sx={{ width: "100%" }}>
      <Typography variant="h5" align="center">
        Месячный отчёт по неделям
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        Период: {fromT.format("DD.MM.YYYY")} — {toT.format("DD.MM.YYYY")}{" "}
        (Пн–Вс)
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
