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
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Button,
  CircularProgress,
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
import React, {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertState,
  AppState,
  DurationItem,
  MenuState,
  TaskItemMenu,
} from "../types/global";
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

type RowUI = {
  durationRaw: string;
  cleanComment: string; // комментарий без тегов
  selectedLabel: string | null; // выбранный тип (распарсенный или выбранный из селекта)
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
  // серверное локальное состояние (как приходит)
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

  // UI-состояние для редактируемых строк
  const [rows, setRows] = useState<Record<string, RowUI>>({});

  // выбор типа для "добавить новую"
  const [selectedIssueTypeLabelNew, setSelectedIssueTypeLabelNew] = useState<
    string | null
  >(null);

  // ошибки
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);

  // загрузка списков типов при смене issueId
  useEffect(() => {
    if (menuState.issueId) {
      getIssueTypeList({ setLocalState, token, entityKey: menuState.issueId });
    }
  }, [menuState.issueId, token]);

  // синхронизация UI-строк при изменении durations
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowUI> = {};
      for (const d of durations) {
        const id = String(d.id);
        const parsedLabel = parseFirstIssueTypeLabel(d.comment ?? "") ?? null;
        const clean = stripIssueTypeTags(d.comment ?? "");
        next[id] = {
          durationRaw: prev[id]?.durationRaw ?? d.duration ?? "",
          cleanComment: prev[id]?.cleanComment ?? clean,
          selectedLabel: prev[id]?.selectedLabel ?? parsedLabel,
        };
      }
      return next;
    });
  }, [durations]);

  // автоселект одного типа при редактировании, если ничего не выбрано
  useEffect(() => {
    if (!loaded) return;
    if (issueTypes.length !== 1) return;
    setRows((prev) => {
      const next = { ...prev };
      const only = issueTypes[0].label;
      for (const id of Object.keys(next)) {
        const row = next[id];
        if (!row.selectedLabel) {
          next[id] = { ...row, selectedLabel: only };
        }
      }
      return next;
    });
  }, [loaded, issueTypes]);

  // --- валидация длительности ---
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

  // --- РЕДАКТИРОВАНИЕ СУЩЕСТВУЮЩИХ ---
  const handleDurationChange = useCallback(
    (
      item: DurationItem,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const id = String(item.id);
      const newDurationRaw = event.target.value ?? "";
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            durationRaw: "",
            cleanComment: "",
            selectedLabel: null,
          }),
          durationRaw: newDurationRaw,
        },
      }));
      const errorMessage = validateDurationValue(newDurationRaw);
      setValidationErrors((prev) => ({ ...prev, [id]: errorMessage }));
    },
    [validateDurationValue]
  );

  const handleCommentChange = useCallback(
    (
      item: DurationItem,
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const id = String(item.id);
      const newComment = event.target.value ?? "";
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            durationRaw: "",
            cleanComment: "",
            selectedLabel: null,
          }),
          cleanComment: newComment,
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
            durationRaw: "",
            cleanComment: "",
            selectedLabel: null,
          }),
          selectedLabel: label || null,
        },
      }));
    },
    []
  );

  const handleSubmitItem = useCallback(
    (item: DurationItem) => {
      const id = String(item.id);
      const row = rows[id];
      const durationToValidate = row?.durationRaw ?? item.duration ?? "";
      const errorMessage = validateDurationValue(durationToValidate);
      if (errorMessage) {
        setValidationErrors((prev) => ({ ...prev, [id]: errorMessage }));
        return;
      }

      // тип обязателен для редактирования, если список типов не пуст
      if ((issueTypes.length ?? 0) > 0 && !row?.selectedLabel) {
        setValidationErrors((prev) => ({
          ...prev,
          [id]: "Укажите тип работы",
        }));
        return;
      }

      const finalComment = buildFinalComment(
        row?.cleanComment ?? stripIssueTypeTags(item.comment ?? ""),
        row?.selectedLabel ?? undefined
      );

      setData({
        setState,
        setAlert,
        token,
        issueId: menuState.issueId,
        duration: normalizeDuration(durationToValidate),
        comment: finalComment,
        worklogId: item.id,
      });
      onClose();
    },
    [
      rows,
      validateDurationValue,
      issueTypes.length,
      setData,
      setState,
      setAlert,
      token,
      menuState.issueId,
      onClose,
    ]
  );

  // --- ДОБАВЛЕНИЕ НОВОЙ ОТМЕТКИ ---
  const [newEntry, setNewEntry] = useState<{
    duration: string;
    comment: string;
  }>({
    duration: "",
    comment: "",
  });

  const handleAddNewDuration = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? "";
      setNewEntry((p) => ({ ...p, duration: value }));
      const error = validateDurationValue(value);
      setValidationErrors((prev) => ({ ...prev, add_new: error }));
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

  // автоселект одного типа в "Добавить"
  useEffect(() => {
    if (!loaded) return;
    if (issueTypes.length !== 1) return;
    setSelectedIssueTypeLabelNew((prev) => prev ?? issueTypes[0].label);
  }, [loaded, issueTypes]);

  const handleIssueTypeChangeNew = useCallback((label: string) => {
    setSelectedIssueTypeLabelNew(label || null);
  }, []);

  const handleNewSubmitItem = useCallback(() => {
    const err = validateDurationValue(newEntry.duration);
    if (err) {
      setValidationErrors((prev) => ({ ...prev, add_new: err }));
      return;
    }

    // тип обязателен при добавлении, если список типов не пуст
    if ((issueTypes.length ?? 0) > 0 && !selectedIssueTypeLabelNew) {
      setValidationErrors((prev) => ({
        ...prev,
        add_new: "Укажите тип работы",
      }));
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

  // --- УДАЛЕНИЕ ---
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
                  durationRaw: item.duration ?? "",
                  cleanComment: stripIssueTypeTags(item.comment ?? ""),
                  selectedLabel:
                    parseFirstIssueTypeLabel(item.comment ?? "") ?? null,
                };
                const itemError = validationErrors[id];
                const typeRequired =
                  (issueTypes.length ?? 0) > 0 && !row.selectedLabel;

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
                          if (e.key === "Enter") handleSubmitItem(item);
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
                          if (e.key === "Enter") handleSubmitItem(item);
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
                      <IconButton
                        onClick={() => handleSubmitItem(item)}
                        disabled={
                          !loaded ||
                          !row.durationRaw ||
                          row.durationRaw === "P" ||
                          row.durationRaw === "PT0S" ||
                          Boolean(itemError) ||
                          ((issueTypes.length ?? 0) > 0 && !row.selectedLabel)
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
                    ((issueTypes.length ?? 0) > 0 && !selectedIssueTypeLabelNew)
                  }
                  helperText={
                    validationErrors["add_new"] ||
                    ((issueTypes.length ?? 0) > 0 && !selectedIssueTypeLabelNew
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

              <Grid size={2}>
                <IconButton
                  onClick={handleNewSubmitItem}
                  disabled={
                    !loaded ||
                    Boolean(validationErrors["add_new"]) ||
                    ((issueTypes.length ?? 0) > 0 && !selectedIssueTypeLabelNew)
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
