import React, { FC, Fragment, useCallback, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormHelperText,
  Grid2 as Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  displayDuration,
  headerWeekName,
  isValidDuration,
  normalizeDuration,
} from "@/helpers";
import { DurationItem, MenuState, AlertState, AppState } from "../types/global";
import { SetDataArgs, DeleteDataArgs } from "@/actions/data";

interface TableCellMenuProps {
  open: boolean;
  onClose: () => void;
  menuState: MenuState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  deleteData: (args: DeleteDataArgs) => void;
  token: string | null;
  setData: (args: SetDataArgs) => void;
  setAlert: (args: AlertState) => void;
}

const TableCellMenu: FC<TableCellMenuProps> = ({
  open,
  onClose,
  menuState,
  setState,
  deleteData,
  token,
  setData,
  setAlert,
}) => {
  // Состояние для ошибок валидации
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Локальное состояние для хранения данных (duration и comment)
  const [localState, setLocalState] = useState<DurationItem[]>(
    (menuState.durations || []).flat().map((item) => ({
      ...item,
      comment: item.comment || "",
    }))
  );

  // Состояние для показа диалога подтверждения удаления
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);

  // Синхронизируем локальное состояние при обновлении menuState.durations
  useEffect(() => {
    setLocalState(
      (menuState.durations || []).flat().map((item) => ({
        ...item,
        comment: item.comment || "",
      }))
    );
  }, [menuState.durations]);

  // Функция валидации длительности
  const validateDurationValue = useCallback((rawValue: string): string => {
    const normalized = normalizeDuration(rawValue);
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      return `Значение "${rawValue}" не является корректным форматом времени.`;
    }
    return "";
  }, []);

  // Состояние для новой записи
  const [newEntry, setNewEntry] = useState<{
    duration: string;
    comment: string;
  }>({
    duration: "",
    comment: "",
  });

  const handleAddNewDuration = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewEntry((prev) => ({ ...prev, duration: value }));
      const error = validateDurationValue(value);
      setValidationErrors((prev) => ({ ...prev, add_new: error }));
    },
    [validateDurationValue]
  );

  const handleAddNewComment = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewEntry((prev) => ({ ...prev, comment: value }));
    },
    []
  );

  const handleNewSubmitItem = useCallback(() => {
    const error = validateDurationValue(newEntry.duration);
    if (error) {
      setValidationErrors((prev) => ({ ...prev, add_new: error }));
      return;
    }
    const duration = normalizeDuration(newEntry.duration);
    setData({
      dateCell: menuState.dateField || undefined,
      setState,
      setAlert,
      token,
      issueId: menuState.issueId,
      duration,
      comment: newEntry.comment,
    });
    setNewEntry({ duration: "", comment: "" });
    onClose();
  }, [
    newEntry,
    menuState,
    setData,
    setState,
    setAlert,
    token,
    onClose,
    validateDurationValue,
  ]);

  const handleConfirmDeleteAll = useCallback(() => {
    if (menuState.durations) {
      deleteData({
        token,
        setState,
        setAlert,
        issueId: menuState.issueId,
        ids: menuState.durations.flat().map((item) => item.id),
      });
    }
    setOpenConfirm(false);
    onClose();
  }, [menuState, token, deleteData, setState, setAlert, onClose]);

  const handleCancelDeleteAll = useCallback(() => {
    setOpenConfirm(false);
  }, []);

  const handleDeleteItem = useCallback(
    (item: DurationItem) => {
      deleteData({
        token,
        setState,
        setAlert,
        issueId: menuState.issueId,
        ids: [item.id],
      });
      onClose();
    },
    [menuState.issueId, token, deleteData, setState, setAlert, onClose]
  );

  const handleDurationChange = useCallback(
    (
      item: DurationItem,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const newDurationRaw = event.target.value;
      setLocalState((prev) =>
        prev.map((d) =>
          d.id === item.id ? { ...d, duration: newDurationRaw } : d
        )
      );
      const errorMessage = validateDurationValue(newDurationRaw);
      setValidationErrors((prev) => ({ ...prev, [item.id]: errorMessage }));
    },
    [validateDurationValue]
  );

  const handleCommentChange = useCallback(
    (
      item: DurationItem,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const newComment = event.target.value;
      setLocalState((prev) =>
        prev.map((d) => (d.id === item.id ? { ...d, comment: newComment } : d))
      );
    },
    []
  );

  const handleSubmitItem = useCallback(
    (item: DurationItem) => {
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
    },
    [
      validateDurationValue,
      setData,
      setState,
      setAlert,
      token,
      menuState.issueId,
      onClose,
    ]
  );

  return (
    <>
      <Menu
        anchorEl={menuState.anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Grid container spacing={2} sx={{ p: 2.5, width: 440 }}>
          <Grid size={8}>
            <Typography variant="subtitle1">
              {menuState.issue} {menuState.issueId}
            </Typography>
          </Grid>
          <Grid
            size={4}
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
          >
            <Typography variant="subtitle2" color="success">
              {menuState.field &&
                headerWeekName[
                  menuState.field as keyof typeof headerWeekName
                ]}{" "}
              {menuState.dateField && menuState.dateField.format("DD.MM")}
            </Typography>
            <IconButton
              onClick={onClose}
              sx={(theme) => ({
                borderRadius: "50%",
                p: 2,
                ml: 2,
                color: theme.palette.background.default,
                background: theme.palette.primary.light,
                "&:hover": {
                  color: theme.palette.background.default,
                  background: theme.palette.primary.main,
                },
              })}
            >
              <CloseIcon />
            </IconButton>
          </Grid>

          <Grid size={12}>
            <Typography variant="h6" color="info">
              Редактировать отметки времени
            </Typography>
          </Grid>
          {localState.map((item) => (
            <Fragment key={item.id}>
              <Grid size={3}>
                <TextField
                  required
                  label="Длительность"
                  name="duration"
                  value={displayDuration(item.duration)}
                  onChange={(e) => handleDurationChange(item, e)}
                  error={Boolean(validationErrors[item.id])}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleSubmitItem(item);
                  }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  name="comment"
                  value={item.comment}
                  onChange={(e) => handleCommentChange(item, e)}
                  aria-label="minimum height"
                  minRows={2}
                  placeholder="Комментарий"
                  fullWidth
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleSubmitItem(item);
                  }}
                />
              </Grid>
              <Grid size={1.5}>
                <IconButton
                  onClick={() => handleSubmitItem(item)}
                  disabled={
                    !item.duration ||
                    item.duration === "P" ||
                    item.duration === "PT0S" ||
                    Boolean(validationErrors[item.id])
                  }
                >
                  <CheckIcon color="success" />
                </IconButton>
              </Grid>
              <Grid size={1.5}>
                <IconButton onClick={() => handleDeleteItem(item)}>
                  <DeleteOutlineIcon color="error" />
                </IconButton>
              </Grid>
              <Grid size={12}>
                <FormHelperText error>
                  {validationErrors[item.id] || ""}
                </FormHelperText>
              </Grid>
            </Fragment>
          ))}
        </Grid>
        {menuState.dateField && (
          <>
            <Divider />
            <Grid container spacing={2} sx={{ p: 2.5, width: 440 }}>
              <Grid size={12}>
                <Typography variant="h6" color="info">
                  Добавить отметку времени
                </Typography>
              </Grid>
              <Grid size={3}>
                <TextField
                  required
                  label="Длительность"
                  name="duration"
                  value={newEntry.duration}
                  onChange={handleAddNewDuration}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleNewSubmitItem();
                  }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  name="comment"
                  label="Комментарий"
                  value={newEntry.comment}
                  onChange={handleAddNewComment}
                  aria-label="minimum height"
                  minRows={2}
                  placeholder="Комментарий"
                  fullWidth
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleNewSubmitItem();
                  }}
                />
              </Grid>
              <Grid size={1.5}>
                <IconButton
                  onClick={handleNewSubmitItem}
                  disabled={Boolean(validationErrors["add_new"])}
                >
                  <CheckIcon color="success" />
                </IconButton>
              </Grid>
              <Grid size={12}>
                <FormHelperText error>
                  {validationErrors["add_new"] || ""}
                </FormHelperText>
              </Grid>
            </Grid>
          </>
        )}
        <Divider sx={{ mb: 2 }} />
        <MenuItem onClick={() => setOpenConfirm(true)} sx={{ mb: 2 }}>
          <ListItemIcon>
            <DeleteForeverIcon color="error" />
          </ListItemIcon>
          <ListItemText color="error">Удалить все</ListItemText>
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
};

export default TableCellMenu;
