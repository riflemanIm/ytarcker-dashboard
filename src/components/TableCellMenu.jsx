import { displayDuration, isValidDuration, normalizeDuration } from "@/helpers";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useState } from "react";

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

  // Состояние для показа диалога подтверждения удаления всех
  const [openConfirm, setOpenConfirm] = useState(false);

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

  const handleConfirmDeleteAll = () => {
    deleteData({
      token,
      setState,
      setAlert,
      issueId: menuState.issueId,
      ids: menuState.durations.map((item) => item.id),
    });
    setOpenConfirm(false);
    onClose();
  };

  const handleCancelDeleteAll = () => {
    setOpenConfirm(false);
  };

  const handleDeleteItem = (item) => {
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
    setData({
      setState,
      setAlert,
      token,
      issueId: menuState.issueId,
      duration: normalized,
      comment: item.comment,
      worklogId: item.id,
    });
    onClose();
  };

  return (
    <>
      <Menu
        anchorEl={menuState.anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Grid container spacing={2} sx={{ padding: 2.5, width: 440 }}>
          <Grid item size={12}>
            <Typography variant="h5">
              {menuState.issue} {menuState.issueId}
            </Typography>
          </Grid>
          {(localState || []).map((item) => (
            <Fragment key={item.id}>
              <Grid item size={3}>
                <TextField
                  required
                  label="Длительность"
                  name="duration"
                  value={displayDuration(item.duration)}
                  onChange={(e) => handleDurationChange(item, e)}
                  error={Boolean(validationErrors[item.id])}
                  helperText={validationErrors[item.id] || ""}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSumbitItem(item);
                    }
                  }}
                />
              </Grid>
              <Grid item size={6}>
                <TextField
                  name="comment"
                  value={item.comment}
                  onChange={(e) => handleCommentChange(item, e)}
                  aria-label="minimum height"
                  minRows={2}
                  placeholder="Комментарий"
                  style={{ width: "100%" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSumbitItem(item);
                    }
                  }}
                />
              </Grid>
              <Grid item size={1.5}>
                <IconButton
                  onClick={() => handleSumbitItem(item)}
                  disabled={
                    !item.duration ||
                    item.duration === "P" ||
                    item.duration === "PT0S" ||
                    validationErrors[item.id]
                  }
                >
                  <CheckIcon color="success" />
                </IconButton>
              </Grid>
              <Grid item size={1.5}>
                <IconButton onClick={() => handleDeleteItem(item)}>
                  <DeleteOutlineIcon color="error" />
                </IconButton>
              </Grid>
            </Fragment>
          ))}
        </Grid>
        <Divider sx={{ mb: 2 }} />
        <MenuItem onClick={() => setOpenConfirm(true)} sx={{ mb: 2 }}>
          <ListItemIcon>
            <DeleteForeverIcon color="error" />
          </ListItemIcon>
          <ListItemText color="error">Удалить все</ListItemText>
        </MenuItem>
        <MenuItem onClick={onClose}>
          <ListItemIcon>
            <CloseIcon color="primary" />
          </ListItemIcon>
          <ListItemText sx={{ color: "primary" }}>Закрыть</ListItemText>
        </MenuItem>
      </Menu>
      <Dialog open={openConfirm} onClose={handleCancelDeleteAll}>
        <DialogTitle>
          Вы действительно хотите удалить все отметки времени?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {menuState.issue} {menuState.issueId}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteAll} color="primary">
            Отмена
          </Button>
          <Button onClick={handleConfirmDeleteAll} color="error" autoFocus>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TableCellMenu;
