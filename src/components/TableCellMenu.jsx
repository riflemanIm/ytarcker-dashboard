import {
  Grid2 as Grid,
  IconButton,
  TextField,
  TextareaAutosize,
} from "@mui/material";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Fragment, useEffect, useState } from "react";

import { displayDuration, normalizeDuration, isValidDuration } from "@/helpers";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

function TableCellMenu({
  open,
  onClose,
  menuState,
  setState,
  deleteData,
  token,
  setData,
  setAlert,
}) {
  // Состояние для ошибок валидации (ключ – id элемента)
  const [validationErrors, setValidationErrors] = useState({});
  // Локальное состояние для хранения данных (duration и comment) в ISO8601 формате
  const [localState, setLocalState] = useState(
    (menuState.durations || []).map((item) => ({
      ...item,
      comment: item.comment || "",
    }))
  );

  // Синхронизация локального состояния при обновлении menuState.durations
  useEffect(() => {
    setLocalState(
      (menuState.durations || []).map((item) => ({
        ...item,
        comment: item.comment || "",
      }))
    );
  }, [menuState.durations]);

  // Функция валидации длительности.
  // Возвращает пустую строку, если значение корректное, или сообщение об ошибке.
  const validateDurationValue = (rawValue) => {
    const normalized = normalizeDuration(rawValue);
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      return `Значение "${rawValue}" не является корректным форматом времени.`;
    }
    return "";
  };

  const onDeleteAll = () => {
    console.log("onDeleteAll--", menuState);
    deleteData({
      token,
      setState,
      setAlert,
      issueId: menuState.issueId,
      ids: menuState.durations.map((item) => item.id),
    });
    onClose();
  };

  const handleDeleteItem = (item) => {
    console.log("Удаление элемента:", item);
    deleteData({
      token,
      setState,
      setAlert,
      issueId: menuState.issueId,
      ids: [item.id],
    });
    onClose();
  };

  // Валидация производится сразу при изменении поля, локальное состояние обновляется
  const handleDurationChange = (item, event) => {
    const newDurationRaw = event.target.value;
    setLocalState((prev) =>
      prev.map((d) =>
        d.id === item.id ? { ...d, duration: newDurationRaw } : d
      )
    );
    const errorMessage = validateDurationValue(newDurationRaw);
    if (errorMessage) {
      setValidationErrors((prev) => ({ ...prev, [item.id]: errorMessage }));
    } else {
      setValidationErrors((prev) => ({ ...prev, [item.id]: "" }));
    }
  };

  const handleCommentChange = (item, event) => {
    const newComment = event.target.value;
    setLocalState((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, comment: newComment } : d))
    );
  };

  // При сабмите происходит валидация и, если все корректно, вызывается setData с нормализованным duration и текущим comment
  const handleSumbitItem = (item) => {
    const errorMessage = validateDurationValue(item.duration);
    if (errorMessage) {
      setValidationErrors((prev) => ({ ...prev, [item.id]: errorMessage }));
      return;
    }
    const normalized = normalizeDuration(item.duration);
    // setData({
    //   setState,
    //   setAlert,
    //   token,
    //   issueId: menuState.issueId,
    //   id: item.id,
    //   duration: normalized,
    //   comment: item.comment,
    // });
    onClose();
  };

  console.log("menuState--", menuState);
  return (
    <Menu
      anchorEl={menuState.anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      sx={{ minWidth: 220 }}
    >
      <Grid container spacing={3} sx={{ padding: 3 }}>
        {(localState || []).map((item) => (
          <Fragment key={item.id}>
            <Grid item size={4}>
              <TextField
                required
                label="Длительность"
                name="duration"
                value={displayDuration(item.duration)}
                onChange={(e) => handleDurationChange(item, e)}
                error={Boolean(validationErrors[item.id])}
                helperText={validationErrors[item.id] || ""}
              />
            </Grid>
            <Grid item size={4}>
              <TextareaAutosize
                name="comment"
                value={item.comment}
                onChange={(e) => handleCommentChange(item, e)}
                aria-label="minimum height"
                minRows={2}
                placeholder="Комментарий"
                style={{ width: "100%" }}
              />
            </Grid>
            <Grid item size={2}>
              <IconButton onClick={() => handleSumbitItem(item)}>
                <CheckIcon />
              </IconButton>
            </Grid>
            <Grid item size={2}>
              <IconButton onClick={() => handleDeleteItem(item)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Grid>
          </Fragment>
        ))}
      </Grid>
      <Divider />
      <MenuItem onClick={onDeleteAll}>
        <ListItemIcon>
          <DeleteForeverIcon fontSize="small" color="error" />
        </ListItemIcon>
        <ListItemText color="error">Удалить все</ListItemText>
      </MenuItem>
      <MenuItem onClick={onClose}>
        <ListItemIcon>
          <CloseIcon fontSize="small" color="primary" />
        </ListItemIcon>
        <ListItemText sx={{ color: "primary" }}>Закрыть</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default TableCellMenu;
