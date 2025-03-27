import { useMemo, useCallback, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { IconButton } from "@mui/material";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";

import Typography from "@mui/material/Typography";
import ContentCut from "@mui/icons-material/ContentCut";
import ContentCopy from "@mui/icons-material/ContentCopy";
import ContentPaste from "@mui/icons-material/ContentPaste";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DurationAlert from "./DurationAlert";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // ✅ добавляем utc
import { daysMap, getDateOfWeekday, sumDurations } from "@/helpers";
dayjs.locale("ru");
dayjs.extend(utc); // ✅ расширяем

function MenuCell({
  open,
  onClose,
  menuState,
  setState,
  deleteData,
  token,
  setData,
}) {
  const onDeleteAll = () => {
    console.log("onDeleteAll--");
    deleteData({
      token,
      setState,
      issueId: menuState.issueId,
      ids: menuState.durations.map((item) => item.id),
    });
    onClose();
  };
  return (
    <Menu
      anchorEl={menuState.anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      sx={{ width: 320, maxWidth: "100%" }}
    >
      <MenuItem>
        <ListItemIcon>
          <ContentCut fontSize="small" />
        </ListItemIcon>
        <ListItemText>Cut</ListItemText>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          ⌘X
        </Typography>
      </MenuItem>
      <MenuItem>
        <ListItemIcon>
          <ContentCopy fontSize="small" />
        </ListItemIcon>
        <ListItemText>Copy</ListItemText>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          ⌘C
        </Typography>
      </MenuItem>
      <MenuItem>
        <ListItemIcon>
          <ContentPaste fontSize="small" />
        </ListItemIcon>
        <ListItemText>Paste</ListItemText>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          ⌘V
        </Typography>
      </MenuItem>
      <Divider />
      <MenuItem onClick={onDeleteAll}>
        <ListItemIcon>
          <DeleteForeverIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Удалить все</ListItemText>
      </MenuItem>
      <MenuItem onClick={onClose}>
        <ListItemIcon>
          <CloseIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Закрыть</ListItemText>
      </MenuItem>
    </Menu>
  );
}
const IssueDisplay = ({ display, href = null, fio = null }) => (
  <>
    <Typography variant="subtitle1">
      {href && (
        <IconButton component="a" href={href} target="_blank">
          <OpenInNewIcon />
        </IconButton>
      )}
      {display}
    </Typography>
    {fio && <Typography variant="subtitle2">{fio}</Typography>}
  </>
);

const isValidDuration = (duration) => {
  const iso8601DurationRegex =
    /^P(?=\d|T\d)(\d+D)?(T(?=\d+[HM])(\d+H)?(\d+M)?)?$/i;
  return iso8601DurationRegex.test(duration);
};

const normalizeDuration = (input) => {
  if (isValidDuration(input)) return input;

  const regex = /^(?:(\d+)[dD])?(?:(\d+)[hH])?(?:(\d+)[mM])?$/;
  const match = input.trim().match(regex);

  if (!match || (!match[1] && !match[2] && !match[3])) {
    return input; // невалидный формат, возвращаем исходное значение
  }

  const [, days, hours, minutes] = match;

  let result = "P";
  if (days) result += `${parseInt(days, 10)}D`;
  if (hours || minutes) result += "T";
  if (hours) result += `${parseInt(hours, 10)}H`;
  if (minutes) result += `${parseInt(minutes, 10)}M`;

  return result;
};

const headerWeekName = {
  monday: "Пн",
  tuesday: "Вт",
  wednesday: "Ср",
  thursday: "Чт",
  friday: "Пт",
  saturday: "Сб",
  sunday: "Вс",
};

const transformData = (data, userId) => {
  const result = {};
  console.log("data", data);
  data.forEach((item) => {
    const dayOfWeek = dayjs.utc(item.updatedAt).isoWeekday();
    if (!result[item.key]) {
      result[item.key] = {
        id: item.key,
        issue: {
          display: item.issue,
          //href: item.href,
          fio: !userId ? item.updatedBy : null,
        },
        issueId: item.issueId,
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    }

    result[item.key][daysMap[dayOfWeek - 1]].push(item.duration);
  });

  return Object.values(result).map((item) => {
    const totalDurations = [
      ...item.monday,
      ...item.tuesday,
      ...item.wednesday,
      ...item.thursday,
      ...item.friday,
      ...item.saturday,
      ...item.sunday,
    ];
    return {
      ...item,
      monday: sumDurations(item.monday),
      tuesday: sumDurations(item.tuesday),
      wednesday: sumDurations(item.wednesday),
      thursday: sumDurations(item.thursday),
      friday: sumDurations(item.friday),
      saturday: sumDurations(item.saturday),
      sunday: sumDurations(item.sunday),
      total: sumDurations(totalDurations).replace(/P|T/g, ""),
    };
  });
};

const TaskTable = ({ data, userId, setState, token, setData, deleteData }) => {
  //console.log("data", data);

  const [alert, setAlert] = useState(null);
  const handleCloseAlert = () => setAlert(null);
  const tableRows = transformData(data, userId);

  const [menuState, setMenuState] = useState({
    anchorEl: null,
    rowId: null,
    field: null,
    issueId: null,
    durations: null,
  });

  const handleMenuOpen = (event, params) => {
    setMenuState({
      anchorEl: event.currentTarget,
      rowId: params.row.id,
      field: params.field,
      issueId: params.row.issueId,
      durations: data.find((row) => row.key === params.row.id).durations,
    });
  };

  const handleMenuClose = () =>
    setMenuState({
      anchorEl: null,
      rowId: null,
      field: null,
      issueId: null,
      durations: null,
    });

  const calculateTotalRow = useCallback((rows) => {
    const fields = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const totals = {};
    const totalsVals = {};
    fields.forEach((field) => {
      totals[field] = sumDurations(rows.map((row) => row[field])).replace(
        /P|T/g,
        ""
      );
      totalsVals[field] = sumDurations(rows.map((row) => row[field]));
    });

    totals.total = sumDurations(Object.values(totalsVals)).replace(/P|T/g, "");

    return {
      id: "total",
      issue: { display: "Итого" },
      issueId: "",
      ...totals,
    };
  }, []);

  const totalRow = useMemo(
    () => calculateTotalRow(tableRows),
    [tableRows, calculateTotalRow]
  );

  const handleCellEdit = useCallback((key, field, newValue, issueId) => {
    const normalizedValue = normalizeDuration(newValue);
    if (
      normalizedValue.trim() === "" ||
      normalizedValue === "P" ||
      token == null
    ) {
      return false;
    }
    if (!isValidDuration(normalizedValue)) {
      setAlert(
        `Значение "${newValue}" не является корректным форматом времени.`
      );
      return false;
    }

    try {
      const dayOfWeek = daysMap.findIndex((k) => k === field);
      const dateCell = getDateOfWeekday(dayOfWeek);

      console.log("dayOfWeek", dayOfWeek, "dateCell", dateCell);

      setData({
        dateCell,
        setState,
        token,
        issueId,
        duration: normalizedValue,
      });

      setAlert(null);
      setData((prev) => {
        const updatedRows = transformData(prev, userId).map((row) =>
          row.key === key ? { ...row, [field]: normalizedValue } : row
        );
        return updatedRows;
      });
      return true;
    } catch (err) {
      console.log("ERROR ", err.message);

      setAlert(err.message);
      return false;
    }
  }, []);

  const columns = [
    {
      field: "issue",
      headerName: "Название",
      flex: 4,
      sortable: false,
      renderCell: (params) =>
        params.row.id !== "total" ? (
          <IssueDisplay
            display={params.value.display}
            href={params.value.href}
            fio={params.value.fio}
          />
        ) : (
          params.value.display
        ),
    },
    { field: "issueId", headerName: "Issue Id", flex: 1.5 },
    ...[
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day) => ({
      field: day,
      headerName: headerWeekName[day],
      flex: 1,
      editable: true,
      sortable: false,
      renderCell: (params) => {
        const val = params.value.replace(/^P(?:T)?|T/g, "") || "";
        if (params.row.id === "total" || val === "") return val;
        return (
          <div
            onClick={(e) => handleMenuOpen(e, params)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            {val}
          </div>
        );
      },
      renderEditCell: (params) => (
        <input
          type="text"
          autoFocus
          style={{
            border: "none",
            outline: "none",
            width: "100%",
            height: "100%",
            fontSize: "inherit",
            fontFamily: "inherit",
            padding: "0 8px",
            boxSizing: "border-box",
          }}
          defaultValue=""
          onBlur={(e) => {
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: e.target.value,
            });
            params.api.stopCellEditMode({ id: params.id, field: params.field });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: e.target.value,
              });
              params.api.stopCellEditMode({
                id: params.id,
                field: params.field,
              });
            } else if (e.key === "Escape") {
              params.api.stopCellEditMode({
                id: params.id,
                field: params.field,
                ignoreModifications: true,
              });
            }
          }}
        />
      ),
    })),
    { field: "total", headerName: "Итого", flex: 1.5 },
  ];

  return (
    <>
      <DurationAlert
        open={!!alert}
        message={alert}
        onClose={handleCloseAlert}
      />
      <DataGrid
        rows={[...tableRows, totalRow]}
        columns={columns}
        disableColumnMenu
        pageSizeOptions={[15]}
        isCellEditable={(params) => {
          //console.log("isCellEditable params", params);
          return params.value === "P";
        }}
        processRowUpdate={(updatedRow, originalRow) =>
          handleCellEdit(
            updatedRow.id,
            Object.keys(updatedRow).find(
              (key) => updatedRow[key] !== originalRow[key]
            ),
            updatedRow[
              Object.keys(updatedRow).find(
                (key) => updatedRow[key] !== originalRow[key]
              )
            ],
            updatedRow.issueId
          )
            ? updatedRow
            : originalRow
        }
        getRowClassName={(params) => (params.id === "total" ? "no-hover" : "")}
        sx={{
          "& .no-hover:hover": { backgroundColor: "transparent !important" },
        }}
      />
      <MenuCell
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
        menuState={menuState}
        deleteData={deleteData}
        token={token}
        setData={setData}
        setState={setState}
      />
    </>
  );
};

export default TaskTable;
