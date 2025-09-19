import React, { FC, Fragment, useCallback, useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
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
import isEmpty, {
  displayDuration,
  headerWeekName,
  isValidDuration,
  normalizeDuration,
} from "@/helpers";
import {
  DurationItem,
  MenuState,
  AlertState,
  AppState,
  TaskItemMenu,
} from "../types/global";
import { SetDataArgs, DeleteDataArgs, getIssueTypeList } from "@/actions/data";
import SelectIssueTypeList from "./SelectIssueTypeList";

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
  // --- выбор IssueType (добавление)
  const [selectedIssueTypeLabelNew, setSelectedIssueTypeLabelNew] = useState<
    string | null
  >(null);
  // --- выбор IssueType (редактирование, по строкам)
  const [selectedIssueTypeById, setSelectedIssueTypeById] = useState<
    Record<string, string | null>
  >({});

  // --- helper
  const mergeCommentWithIssueType = useCallback(
    (comment: string, label?: string | null) => {
      const base = (comment ?? "").trim();
      const tag = (label ?? "").trim();
      if (!tag) return base;

      // Уже есть такой тег?
      const parts = base
        .split("•")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.includes(tag)) return base;

      // Если пусто — начинаем с "• tag", иначе добавляем " • tag"
      return base ? `${base} • ${tag}` : `• ${tag}`;
    },
    []
  );

  // --- helper: комментарий содержит хотя бы один тип
  const commentHasAnyIssueType = useCallback(
    (comment: string, list: { label: string }[] | undefined) => {
      if (!list || list.length === 0) return false;
      const c = (comment ?? "").trim();
      if (!c) return false;
      return list.some((t) => t.label && c.includes(t.label));
    },
    []
  );

  // валидации
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // локальное состояние
  const [localState, setLocalState] = useState<TaskItemMenu>({
    issue_type_list: [],
    durations: menuState.durations || [],
    loaded: true,
  });

  const [openConfirm, setOpenConfirm] = useState<boolean>(false);

  // загрузка issue types
  useEffect(() => {
    if (menuState.issueId) {
      getIssueTypeList({ setLocalState, token, entityKey: menuState.issueId });
    }
  }, [menuState.issueId, token]);

  // синк durations
  useEffect(() => {
    if (menuState.durations && menuState.durations.length > 0) {
      setLocalState((prev) => ({
        ...prev,
        durations: menuState.durations ? [...menuState.durations] : [],
      }));
    }
  }, [menuState.durations]);

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

  // --- добавление новой записи ---
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

  // выбор типа (добавление) — сразу мержим в комментарий и очищаем селект
  const handleIssueTypeChangeNew = useCallback(
    (label: string) => {
      setSelectedIssueTypeLabelNew(label || null);
      setNewEntry((prev) => ({
        ...prev,
        comment: mergeCommentWithIssueType(prev.comment, label),
      }));
      setTimeout(() => setSelectedIssueTypeLabelNew(null), 0);
    },
    [mergeCommentWithIssueType]
  );

  // выбор типа (редактирование) — мержим в комментарий строки и очищаем селект
  const handleIssueTypeChangeForItem = useCallback(
    (rowId: string | number, label: string) => {
      const key = String(rowId);
      setSelectedIssueTypeById((prev) => ({ ...prev, [key]: label || null }));
      setLocalState((prev) => ({
        ...prev,
        durations: prev.durations?.map((d) =>
          String(d.id) === key
            ? {
                ...d,
                comment: mergeCommentWithIssueType(d.comment ?? "", label),
              }
            : d
        ),
      }));
      setTimeout(() => {
        setSelectedIssueTypeById((prev) => ({ ...prev, [key]: null }));
      }, 0);
    },
    [mergeCommentWithIssueType]
  );

  // отправка новой записи
  const handleNewSubmitItem = useCallback(() => {
    const error = validateDurationValue(newEntry.duration);
    if (error) {
      setValidationErrors((prev) => ({ ...prev, add_new: error }));
      return;
    }
    // требование: тип обязателен
    if (!commentHasAnyIssueType(newEntry.comment, localState.issue_type_list)) {
      setValidationErrors((prev) => ({
        ...prev,
        add_new: "Укажите тип задачи",
      }));
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
      comment: newEntry.comment, // уже склеен при выборе
    });
    setNewEntry({ duration: "", comment: "" });
    onClose();
  }, [
    validateDurationValue,
    newEntry.duration,
    newEntry.comment,
    commentHasAnyIssueType,
    localState.issue_type_list,
    setData,
    menuState.dateField,
    menuState.issueId,
    setState,
    setAlert,
    token,
    onClose,
  ]);

  // удаление
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

  const handleCancelDeleteAll = useCallback(() => setOpenConfirm(false), []);

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
      setLocalState((prev) => ({
        ...prev,
        durations:
          prev.durations &&
          prev.durations.map((d) =>
            d.id === item.id ? { ...d, duration: newDurationRaw } : d
          ),
      }));
      const errorMessage = validateDurationValue(newDurationRaw);
      setValidationErrors((prev) => ({
        ...prev,
        [String(item.id)]: errorMessage,
      }));
    },
    [validateDurationValue]
  );

  const handleCommentChange = useCallback(
    (
      item: DurationItem,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const newComment = event.target.value;
      setLocalState((prev) => ({
        ...prev,
        durations:
          prev.durations &&
          prev.durations.map((d) =>
            d.id === item.id ? { ...d, comment: newComment } : d
          ),
      }));
    },
    []
  );

  // редактирование существующей записи
  const handleSubmitItem = useCallback(
    (item: DurationItem) => {
      const errorMessage = validateDurationValue(item.duration);
      if (errorMessage) {
        setValidationErrors((prev) => ({
          ...prev,
          [String(item.id)]: errorMessage,
        }));
        return;
      }
      // требование: тип обязателен
      if (
        !commentHasAnyIssueType(item.comment ?? "", localState.issue_type_list)
      ) {
        setValidationErrors((prev) => ({
          ...prev,
          [String(item.id)]: "Укажите тип задачи",
        }));
        return;
      }

      const normalized = normalizeDuration(item.duration);
      setData({
        setState,
        setAlert,
        token,
        issueId: menuState.issueId,
        duration: normalized,
        comment: item.comment ?? "", // уже склеен при выборе
        worklogId: item.id,
      });
      onClose();
    },
    [
      validateDurationValue,
      commentHasAnyIssueType,
      localState.issue_type_list,
      setData,
      setState,
      setAlert,
      token,
      menuState.issueId,
      onClose,
    ]
  );
  const addHasType = commentHasAnyIssueType(
    newEntry.comment,
    localState.issue_type_list
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
        <Grid
          container
          spacing={2}
          sx={{ p: 2.5, minWidth: 240, maxWidth: 600 }}
        >
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

          {!isEmpty(localState.durations) && (
            <>
              <Grid size={12}>
                <Typography variant="h6" color="info">
                  Редактировать отметки времени
                </Typography>
              </Grid>

              {localState.durations?.map((item) => {
                const itemError = validationErrors[String(item.id)];
                const itemHasType = commentHasAnyIssueType(
                  item.comment ?? "",
                  localState.issue_type_list
                );

                return (
                  <Fragment key={item.id}>
                    <Grid size={2}>
                      <TextField
                        required
                        label="Длительность"
                        name="duration"
                        value={displayDuration(item.duration)}
                        onChange={(e) => handleDurationChange(item, e)}
                        error={Boolean(itemError)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSubmitItem(item);
                        }}
                      />
                    </Grid>

                    <Grid size={8}>
                      <TextField
                        name="comment"
                        value={item.comment}
                        onChange={(e) => handleCommentChange(item, e)}
                        aria-label="minimum height"
                        placeholder="Комментарий"
                        fullWidth
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSubmitItem(item);
                        }}
                        multiline
                        rows={2}
                        error={!itemHasType || Boolean(itemError)}
                        helperText={
                          itemError ||
                          (!itemHasType ? "Укажите тип работы" : "")
                        }
                      />

                      {localState.issue_type_list && (
                        <SelectIssueTypeList
                          issueTypes={localState.issue_type_list}
                          handleIssueTypeChange={(label) =>
                            handleIssueTypeChangeForItem(item.id, label)
                          }
                          selectedIssueTypeLabel={
                            selectedIssueTypeById[String(item.id)] ?? ""
                          }
                          margin="dense"
                          required // NEW
                          // error={!itemHasType} // NEW
                          // helperText={!itemHasType ? "Укажите тип работы" : ""} // NEW
                          loading={!localState.loaded} // NEW
                        />
                      )}
                    </Grid>

                    <Grid size={1}>
                      <IconButton
                        onClick={() => handleSubmitItem(item)}
                        disabled={
                          !localState.loaded ||
                          !item.duration ||
                          item.duration === "P" ||
                          item.duration === "PT0S" ||
                          Boolean(itemError) ||
                          !itemHasType
                        }
                      >
                        <CheckIcon color="success" />
                      </IconButton>
                    </Grid>

                    <Grid size={1}>
                      <IconButton onClick={() => handleDeleteItem(item)}>
                        <DeleteOutlineIcon color="error" />
                      </IconButton>
                    </Grid>
                  </Fragment>
                );
              })}
            </>
          )}
        </Grid>

        {menuState.dateField && (
          <>
            <Divider />
            <Grid
              container
              spacing={2}
              sx={{ p: 2.5, minWidth: 240, maxWidth: 600 }}
            >
              <Grid size={12}>
                <Typography variant="h6" color="info">
                  Добавить отметку времени
                </Typography>
              </Grid>

              <Grid size={2}>
                <TextField
                  required
                  label="Длительность"
                  name="duration"
                  value={newEntry.duration}
                  onChange={handleAddNewDuration}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") handleNewSubmitItem();
                  }}
                  error={Boolean(validationErrors["add_new"])}
                />
              </Grid>

              <Grid size={8}>
                <TextField
                  name="comment"
                  label="Комментарий"
                  value={newEntry.comment}
                  onChange={handleAddNewComment}
                  aria-label="minimum height"
                  minRows={2}
                  placeholder="Комментарий"
                  fullWidth
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") handleNewSubmitItem();
                  }}
                  multiline
                  rows={3}
                  error={
                    Boolean(validationErrors["add_new"]) ||
                    !commentHasAnyIssueType(
                      newEntry.comment,
                      localState.issue_type_list
                    )
                  }
                  helperText={
                    validationErrors["add_new"] ||
                    (!commentHasAnyIssueType(
                      newEntry.comment,
                      localState.issue_type_list
                    )
                      ? "Укажите тип работы"
                      : "")
                  }
                />

                {localState.issue_type_list && (
                  <SelectIssueTypeList
                    issueTypes={localState.issue_type_list}
                    handleIssueTypeChange={handleIssueTypeChangeNew}
                    selectedIssueTypeLabel={selectedIssueTypeLabelNew ?? ""}
                    margin="dense"
                    required // NEW
                    // error={!addHasType} // NEW
                    // helperText={!addHasType ? "Укажите тип работы" : ""} // NEW
                    loading={!localState.loaded} // NEW
                  />
                )}
              </Grid>

              <Grid size={2}>
                <IconButton
                  onClick={handleNewSubmitItem}
                  disabled={
                    !localState.loaded ||
                    Boolean(validationErrors["add_new"]) ||
                    !commentHasAnyIssueType(
                      newEntry.comment,
                      localState.issue_type_list
                    )
                  }
                >
                  <CheckIcon color="success" />
                </IconButton>
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
