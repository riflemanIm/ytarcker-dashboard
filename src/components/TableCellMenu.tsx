import React, {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { DeleteDataArgs, getIssueTypeList, SetDataArgs } from "@/actions/data";
import isEmpty, {
  displayDuration,
  headerWeekName,
  isValidDuration,
  normalizeDuration,
} from "@/helpers";
import {
  buildFinalComment,
  parseFirstIssueTypeLabel,
  stripIssueTypeTags,
} from "@/helpers/issueTypeComment";

import {
  AlertState,
  AppState,
  DurationItem,
  MenuState,
  TaskItemMenu,
} from "../types/global";
import SelectIssueTypeList from "./SelectIssueTypeList";
import { CheckBox } from "@mui/icons-material";

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

type RowUI = {
  durationRaw: string;
  cleanComment: string; // текст без тегов
  selectedLabel: string | null; // выбранный тип из селекта
};

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
  // --- данные из бэка
  const [localState, setLocalState] = useState<TaskItemMenu>({
    issue_type_list: [],
    durations: menuState.durations || [],
    loaded: true,
  });

  const issueTypes = useMemo(
    () => localState.issue_type_list ?? [],
    [localState.issue_type_list]
  );
  const loaded = localState.loaded ?? true;
  const durations = useMemo<DurationItem[]>(
    () => localState.durations ?? [],
    [localState.durations]
  );

  // --- UI по строкам
  const [rows, setRows] = useState<Record<string, RowUI>>({});

  // --- "Добавить"
  const [newEntry, setNewEntry] = useState<{
    duration: string;
    comment: string;
  }>({ duration: "", comment: "" });
  const [selectedIssueTypeLabelNew, setSelectedIssueTypeLabelNew] = useState<
    string | null
  >(null);

  // --- ошибки и диалоги
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [openConfirm, setOpenConfirm] = useState(false);

  // Загрузка типов
  useEffect(() => {
    if (menuState.issueId) {
      getIssueTypeList({ setLocalState, token, entityKey: menuState.issueId });
    }
  }, [menuState.issueId, token]);

  // Синк rows при изменении durations/issueTypes
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowUI> = {};
      for (const d of durations) {
        const id = String(d.id);
        const parsedLabel = parseFirstIssueTypeLabel(d.comment ?? "") ?? null;
        const clean = stripIssueTypeTags(d.comment ?? "");
        next[id] = {
          durationRaw: prev[id]?.durationRaw ?? d.duration,
          cleanComment: prev[id]?.cleanComment ?? clean,
          selectedLabel:
            prev[id]?.selectedLabel ??
            (issueTypes.find((t) => t.label === parsedLabel)
              ? parsedLabel
              : null),
        };
      }
      return next;
    });
  }, [durations, issueTypes]);

  // Автоселект единственного типа в РЕДАКТИРОВАНИИ (если не выбран)
  useEffect(() => {
    if (!loaded) return;
    if (issueTypes.length !== 1) return;
    const only = issueTypes[0].label;
    setRows((prev) => {
      const copy = { ...prev };
      for (const id of Object.keys(copy)) {
        if (!copy[id]?.selectedLabel)
          copy[id] = { ...copy[id], selectedLabel: only };
      }
      return copy;
    });
  }, [loaded, issueTypes]);

  // Автоселект единственного типа в ДОБАВЛЕНИИ
  useEffect(() => {
    if (!loaded) return;
    if (issueTypes.length === 1 && !selectedIssueTypeLabelNew) {
      setSelectedIssueTypeLabelNew(issueTypes[0].label);
    }
  }, [loaded, issueTypes, selectedIssueTypeLabelNew]);

  // Валидация длительности (safe)
  const validateDurationValue = useCallback((rawValue: string): string => {
    const normalized = normalizeDuration(rawValue ?? "");
    if (
      normalized.trim() === "" ||
      normalized === "P" ||
      !isValidDuration(normalized)
    ) {
      return `Значение "${rawValue ?? ""}" не является корректным форматом времени.`;
    }
    return "";
  }, []);

  // --- handlers: редактирование (поля)
  const handleDurationChange = useCallback(
    (
      item: DurationItem,
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const id = String(item.id);
      const value = e.target.value ?? "";
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            cleanComment: "",
            selectedLabel: null,
            durationRaw: "",
          }),
          durationRaw: value,
        },
      }));
      setValidationErrors((prev) => ({
        ...prev,
        [id]: validateDurationValue(value),
      }));
    },
    [validateDurationValue]
  );

  const handleCommentChange = useCallback(
    (
      item: DurationItem,
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const id = String(item.id);
      const value = e.target.value ?? "";
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            cleanComment: "",
            selectedLabel: null,
            durationRaw: "",
          }),
          cleanComment: value,
        },
      }));
    },
    []
  );

  const handleIssueTypeChangeForItem = useCallback(
    (rowId: string | number, label: string) => {
      const id = String(rowId);
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            cleanComment: "",
            selectedLabel: null,
            durationRaw: "",
          }),
          selectedLabel: label || null,
        },
      }));
    },
    []
  );

  // === Общее сохранение ВСЕХ изменений в блоке редактирования ===
  const validateAllEditRows = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    let anyInvalid = false;

    for (const item of durations) {
      const id = String(item.id);
      const row = rows[id] ?? {
        durationRaw: item.duration,
        cleanComment: stripIssueTypeTags(item.comment ?? ""),
        selectedLabel:
          parseFirstIssueTypeLabel(item.comment ?? "") &&
          issueTypes.find(
            (t) => t.label === parseFirstIssueTypeLabel(item.comment ?? "")
          )
            ? parseFirstIssueTypeLabel(item.comment ?? "")
            : null,
      };

      const durErr = validateDurationValue(
        row.durationRaw ?? item.duration ?? ""
      );
      if (durErr) {
        nextErrors[id] = durErr;
        anyInvalid = true;
        continue;
      }

      // Тип обязателен, если список типов есть
      if (issueTypes.length > 0 && !row.selectedLabel) {
        nextErrors[id] = "Укажите тип работы";
        anyInvalid = true;
      }
    }

    setValidationErrors((prev) => ({ ...prev, ...nextErrors }));
    return !anyInvalid;
  }, [durations, rows, issueTypes, validateDurationValue]);

  const handleSaveAllEdits = useCallback(() => {
    if (!validateAllEditRows()) return;

    // Всё валидно — отправляем все строки
    for (const item of durations) {
      const id = String(item.id);
      const row = rows[id] ?? {
        durationRaw: item.duration,
        cleanComment: stripIssueTypeTags(item.comment ?? ""),
        selectedLabel:
          parseFirstIssueTypeLabel(item.comment ?? "") &&
          issueTypes.find(
            (t) => t.label === parseFirstIssueTypeLabel(item.comment ?? "")
          )
            ? parseFirstIssueTypeLabel(item.comment ?? "")
            : null,
      };

      const finalComment = buildFinalComment(
        row.cleanComment,
        row.selectedLabel ?? undefined
      );

      setData({
        setState,
        setAlert,
        token,
        issueId: menuState.issueId,
        duration: normalizeDuration(row.durationRaw ?? ""),
        comment: finalComment,
        worklogId: item.id,
      });
    }

    onClose();
  }, [
    validateAllEditRows,
    durations,
    rows,
    issueTypes,
    setData,
    setState,
    setAlert,
    token,
    menuState.issueId,
    onClose,
  ]);

  // Кнопка "Сохранить изменения" disabled?
  const editSubmitDisabled = useMemo(() => {
    if (!loaded) return true;
    if (isEmpty(durations)) return true;

    // предварительная быстрая проверка перед submit (не заменяет validateAllEditRows)
    for (const item of durations) {
      const id = String(item.id);
      const row = rows[id] ?? {
        durationRaw: item.duration,
        cleanComment: stripIssueTypeTags(item.comment ?? ""),
        selectedLabel:
          parseFirstIssueTypeLabel(item.comment ?? "") &&
          issueTypes.find(
            (t) => t.label === parseFirstIssueTypeLabel(item.comment ?? "")
          )
            ? parseFirstIssueTypeLabel(item.comment ?? "")
            : null,
      };

      const dur = row.durationRaw ?? "";
      if (!dur || dur === "P" || dur === "PT0S") return true;
      if (validateDurationValue(dur)) return true;
      if (issueTypes.length > 0 && !row.selectedLabel) return true;
    }
    return false;
  }, [loaded, durations, rows, issueTypes, validateDurationValue]);

  // --- ДОБАВИТЬ
  const handleAddNewDuration = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? "";
      setNewEntry((p) => ({ ...p, duration: value }));
      setValidationErrors((p) => ({
        ...p,
        add_new: validateDurationValue(value),
      }));
    },
    [validateDurationValue]
  );

  const handleAddNewComment = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? "";
      setNewEntry((p) => ({ ...p, comment: value }));
    },
    []
  );

  const handleIssueTypeChangeNew = useCallback((label: string) => {
    setSelectedIssueTypeLabelNew(label || null);
  }, []);

  const handleNewSubmitItem = useCallback(() => {
    const err = validateDurationValue(newEntry.duration);
    if (err) {
      setValidationErrors((p) => ({ ...p, add_new: err }));
      return;
    }
    if (issueTypes.length > 0 && !selectedIssueTypeLabelNew) {
      setValidationErrors((p) => ({ ...p, add_new: "Укажите тип работы" }));
      return;
    }

    const finalComment = buildFinalComment(
      newEntry.comment ?? "",
      selectedIssueTypeLabelNew ?? undefined
    );

    setData({
      dateCell: menuState.dateField || undefined,
      setState,
      setAlert,
      token,
      issueId: menuState.issueId,
      duration: normalizeDuration(newEntry.duration ?? ""),
      comment: finalComment,
    });
    setNewEntry({ duration: "", comment: "" });
    setSelectedIssueTypeLabelNew(null);
    onClose();
  }, [
    newEntry,
    validateDurationValue,
    issueTypes.length,
    selectedIssueTypeLabelNew,
    setData,
    menuState.dateField,
    menuState.issueId,
    setState,
    setAlert,
    token,
    onClose,
  ]);

  // --- Удаление
  const handleConfirmDeleteAll = useCallback(() => {
    const ids = (menuState.durations ?? []).map((i) => i.id);
    if (ids.length) {
      deleteData({
        token,
        setState,
        setAlert,
        issueId: menuState.issueId,
        ids,
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

          {!loaded && (
            <Grid
              size={12}
              alignSelf="center"
              justifySelf="center"
              textAlign="center"
            >
              <CircularProgress />
            </Grid>
          )}

          {!isEmpty(durations) && (
            <>
              <Grid size={12}>
                <Typography variant="h6" color="info">
                  Редактировать отметки времени
                </Typography>
              </Grid>

              {durations.map((item) => {
                const id = String(item.id);
                const row = rows[id] ?? {
                  durationRaw: item.duration,
                  cleanComment: stripIssueTypeTags(item.comment ?? ""),
                  selectedLabel:
                    parseFirstIssueTypeLabel(item.comment ?? "") &&
                    issueTypes.find(
                      (t) =>
                        t.label === parseFirstIssueTypeLabel(item.comment ?? "")
                    )
                      ? parseFirstIssueTypeLabel(item.comment ?? "")
                      : null,
                };
                const itemError = validationErrors[id];
                const typeRequired =
                  issueTypes.length > 0 && !row.selectedLabel;

                return (
                  <Fragment key={item.id}>
                    <Grid size={2}>
                      <TextField
                        required
                        label="Длительность"
                        name="duration"
                        value={displayDuration(row.durationRaw)}
                        onChange={(e) => handleDurationChange(item, e)}
                        error={Boolean(itemError)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSaveAllEdits();
                        }}
                      />
                    </Grid>

                    <Grid size={8}>
                      <TextField
                        name="comment"
                        value={row.cleanComment}
                        onChange={(e) => handleCommentChange(item, e)}
                        aria-label="minimum height"
                        placeholder="Комментарий"
                        fullWidth
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleSaveAllEdits();
                        }}
                        multiline
                        rows={2}
                        error={Boolean(itemError) || typeRequired}
                        helperText={
                          itemError ||
                          (typeRequired ? "Укажите тип работы" : "")
                        }
                      />

                      {issueTypes.length > 0 && (
                        <SelectIssueTypeList
                          issueTypes={issueTypes}
                          handleIssueTypeChange={(label) =>
                            handleIssueTypeChangeForItem(item.id, label)
                          }
                          selectedIssueTypeLabel={row.selectedLabel ?? ""}
                          margin="dense"
                          required
                          loading={!loaded}
                        />
                      )}
                    </Grid>

                    <Grid size={1}>
                      <IconButton onClick={() => handleDeleteItem(item)}>
                        <DeleteOutlineIcon color="error" />
                      </IconButton>
                    </Grid>

                    <Grid size={12}>
                      <FormHelperText error>{itemError || ""}</FormHelperText>
                    </Grid>
                  </Fragment>
                );
              })}

              {/* Общая кнопка сохранить изменения */}
              <Grid size={12} display="flex" justifyContent="flex-end" mt={1}>
                <Button
                  variant="contained"
                  onClick={handleSaveAllEdits}
                  disabled={editSubmitDisabled}
                >
                  Сохранить изменения
                </Button>
              </Grid>
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
                  value={newEntry.duration ?? ""}
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
                  value={newEntry.comment ?? ""}
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
                    (issueTypes.length > 0 && !selectedIssueTypeLabelNew)
                  }
                  helperText={
                    validationErrors["add_new"] ||
                    (issueTypes.length > 0 && !selectedIssueTypeLabelNew
                      ? "Укажите тип работы"
                      : "")
                  }
                />

                {issueTypes.length > 0 && (
                  <SelectIssueTypeList
                    issueTypes={issueTypes}
                    handleIssueTypeChange={handleIssueTypeChangeNew}
                    selectedIssueTypeLabel={selectedIssueTypeLabelNew ?? ""}
                    margin="dense"
                    required
                    loading={!loaded}
                  />
                )}
              </Grid>

              <Grid
                size={2}
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
              >
                <Button
                  variant="contained"
                  onClick={handleNewSubmitItem}
                  disabled={
                    !loaded ||
                    Boolean(validationErrors["add_new"]) ||
                    (issueTypes.length > 0 && !selectedIssueTypeLabelNew)
                  }
                >
                  Добавить
                </Button>
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
