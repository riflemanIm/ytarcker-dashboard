import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormHelperText,
  Grid2 as Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
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

import { getIssueTypeList } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import isEmpty, {
  dayOfWeekNameByDate,
  displayDuration,
  displayStartTime,
  headerWeekName,
  isValidDuration,
  normalizeDuration,
} from "@/helpers";
import {
  extractWorkPlanId,
  parseCommentForEditing,
  parseRiskBlock,
} from "@/helpers/issueTypeComment";

import { EditableCellMenuProps } from "@/types/menu";
import { DurationItem, TaskItemMenu } from "../types/global";
import SelectIssueTypeList from "./SelectIssueTypeList";
import PlanningInfoSection from "./PlanningInfoSection";

type RowUI = {
  durationRaw: string;
  cleanComment: string; // текст без тегов
  selectedLabel: string | null; // выбранный тип из селекта
};

const RECENT_ISSUE_TYPES_KEY = "recent_issue_types";

const SetTimeSpend: FC<EditableCellMenuProps> = ({
  open,
  onClose,
  menuState,
  deleteData,
  setData,
}) => {
  const { state, dispatch } = useAppContext();
  const { token } = state.auth;
  const trackerUid =
    state.state.userId ||
    state.tableTimePlanState.selectedPatientUid ||
    (Array.isArray(state.state.users) && state.state.users.length === 1
      ? (state.state.users[0]?.id ?? null)
      : null);
  const [riskState, setRiskState] = useState({
    deadlineOk: true,
    needUpgradeEstimate: false,
    makeTaskFaster: false,
  });
  // --- данные из бэка
  const [localState, setLocalState] = useState<TaskItemMenu>({
    issue_type_list: [],
    durations: menuState.durations || [],
    loaded: true,
  });

  const issueTypes = useMemo(
    () => localState.issue_type_list ?? [],
    [localState.issue_type_list],
  );
  const loaded = localState.loaded ?? true;
  const durations = useMemo<DurationItem[]>(
    () => localState.durations ?? [],
    [localState.durations],
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
  const [recentIssueTypes, setRecentIssueTypes] = useState<string[]>([]);

  const availableRecentTypes = useMemo(
    () =>
      recentIssueTypes.filter((label) =>
        issueTypes.some((type) => type.label === label),
      ),
    [recentIssueTypes, issueTypes],
  );

  useEffect(() => {
    if (!open) return;
    const first = (menuState.durations ?? [])[0];
    if (first?.comment) {
      setRiskState(parseRiskBlock(first.comment));
    } else {
      setRiskState({
        deadlineOk: true,
        needUpgradeEstimate: false,
        makeTaskFaster: false,
      });
    }
  }, [open, menuState.durations]);

  const rememberRecentIssueType = useCallback((label: string | null) => {
    if (!label || typeof window === "undefined") return;
    setRecentIssueTypes((prev) => {
      const next = [label, ...prev.filter((item) => item !== label)].slice(
        0,
        2,
      );
      try {
        window.localStorage.setItem(
          RECENT_ISSUE_TYPES_KEY,
          JSON.stringify(next),
        );
      } catch (error) {
        console.error("Failed to store issue types", error);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(RECENT_ISSUE_TYPES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentIssueTypes(
            parsed
              .filter((item): item is string => typeof item === "string")
              .slice(0, 2),
          );
        }
      }
    } catch (error) {
      console.error("Failed to load stored issue types", error);
    }
  }, []);

  // Загрузка типов
  useEffect(() => {
    if (menuState.issueId) {
      getIssueTypeList({ setLocalState, token, entityKey: menuState.issueId });
    }
  }, [menuState.issueId, token]);

  const getRowFromItem = useCallback(
    (item: DurationItem) => {
      const parsed = parseCommentForEditing(item.comment ?? "", issueTypes);
      return {
        durationRaw: item.duration,
        cleanComment: parsed.cleanComment,
        selectedLabel: parsed.selectedLabel,
      };
    },
    [issueTypes],
  );

  // Синк rows при изменении durations/issueTypes
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, RowUI> = {};
      for (const d of durations) {
        const id = String(d.id);
        const parsed = parseCommentForEditing(d.comment ?? "", issueTypes);
        next[id] = {
          durationRaw: prev[id]?.durationRaw ?? d.duration,
          cleanComment: prev[id]?.cleanComment ?? parsed.cleanComment,
          selectedLabel: prev[id]?.selectedLabel ?? parsed.selectedLabel,
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
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
    [validateDurationValue],
  );

  const handleCommentChange = useCallback(
    (
      item: DurationItem,
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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
    [],
  );

  const handleIssueTypeChangeForItem = useCallback(
    (rowId: string | number, label: string) => {
      const id = String(rowId);
      const normalizedLabel = label || null;
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            cleanComment: "",
            selectedLabel: null,
            durationRaw: "",
          }),
          selectedLabel: normalizedLabel,
        },
      }));
      rememberRecentIssueType(normalizedLabel);
    },
    [rememberRecentIssueType],
  );

  // === Общее сохранение ВСЕХ изменений в блоке редактирования ===
  const validateAllEditRows = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    let anyInvalid = false;

    for (const item of durations) {
      const id = String(item.id);
      const row = rows[id] ?? getRowFromItem(item);

      const durErr = validateDurationValue(
        row.durationRaw ?? item.duration ?? "",
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
  }, [durations, rows, issueTypes, validateDurationValue, getRowFromItem]);

  const handleSaveAllEdits = useCallback(() => {
    if (!validateAllEditRows()) return;

    // Всё валидно — отправляем все строки
    for (const item of durations) {
      const id = String(item.id);
      const row = rows[id] ?? getRowFromItem(item);

      setData({
        dateCell: menuState.dateField || undefined,
        dispatch,
        token,
        issueId: menuState.issueId,
        duration: normalizeDuration(row.durationRaw ?? ""),
        comment: row.cleanComment,
        worklogId: item.id,
        deadlineOk: riskState.deadlineOk,
        needUpgradeEstimate: riskState.needUpgradeEstimate,
        makeTaskFaster: riskState.makeTaskFaster,
        issueTypeLabel: row.selectedLabel ?? null,
        workPlanId: extractWorkPlanId(item.comment ?? "") ?? undefined,
        trackerUid,
        checklistItemId: menuState.checklistItemId ?? undefined,
      });
    }

    onClose();
  }, [
    validateAllEditRows,
    durations,
    rows,
    issueTypes,
    riskState,
    getRowFromItem,
    setData,
    dispatch,
    token,
    menuState.issueId,
    menuState.dateField,
    trackerUid,
    onClose,
  ]);

  // Кнопка "Сохранить изменения" disabled?
  const editSubmitDisabled = useMemo(() => {
    if (!loaded) return true;
    if (isEmpty(durations)) return true;

    // предварительная быстрая проверка перед submit (не заменяет validateAllEditRows)
    for (const item of durations) {
      const id = String(item.id);
      const row = rows[id] ?? getRowFromItem(item);

      const dur = row.durationRaw ?? "";
      if (!dur || dur === "P" || dur === "PT0S") return true;
      if (validateDurationValue(dur)) return true;
      if (issueTypes.length > 0 && !row.selectedLabel) return true;
    }
    return false;
  }, [
    loaded,
    durations,
    rows,
    issueTypes,
    validateDurationValue,
    getRowFromItem,
  ]);

  const riskSection = (
    <>
      <Typography variant="subtitle1">Риски по задаче</Typography>
      <Stack spacing={1} mt={1}>
        <FormControlLabel
          control={
            <Checkbox
              checked={riskState.deadlineOk}
              onChange={(e) =>
                setRiskState((prev) => ({
                  ...prev,
                  deadlineOk: e.target.checked,
                }))
              }
            />
          }
          label="Подтверждаю выполнение в срок"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={riskState.needUpgradeEstimate}
              onChange={(e) =>
                setRiskState((prev) => ({
                  ...prev,
                  needUpgradeEstimate: e.target.checked,
                }))
              }
            />
          }
          label="Требуется увеличить оценку времени"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={riskState.makeTaskFaster}
              onChange={(e) =>
                setRiskState((prev) => ({
                  ...prev,
                  makeTaskFaster: e.target.checked,
                }))
              }
            />
          }
          label="Сделаю быстрее (оценка)"
        />
      </Stack>
    </>
  );

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
    [validateDurationValue],
  );

  const handleAddNewComment = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ?? "";
      setNewEntry((p) => ({ ...p, comment: value }));
    },
    [],
  );

  const handleIssueTypeChangeNew = useCallback(
    (label: string) => {
      const normalizedLabel = label || null;
      setSelectedIssueTypeLabelNew(normalizedLabel);
      rememberRecentIssueType(normalizedLabel);
    },
    [rememberRecentIssueType],
  );

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

    setData({
      dateCell: menuState.dateField || undefined,
      dispatch,
      token,
      issueId: menuState.issueId,
      duration: normalizeDuration(newEntry.duration ?? ""),
      comment: newEntry.comment ?? "",
      deadlineOk: riskState.deadlineOk,
      needUpgradeEstimate: riskState.needUpgradeEstimate,
      makeTaskFaster: riskState.makeTaskFaster,
      issueTypeLabel: selectedIssueTypeLabelNew ?? null,
      trackerUid,
      checklistItemId: menuState.checklistItemId ?? undefined,
    });
    setNewEntry({ duration: "", comment: "" });
    setSelectedIssueTypeLabelNew(null);
    onClose();
  }, [
    newEntry,
    validateDurationValue,
    issueTypes.length,
    selectedIssueTypeLabelNew,
    riskState,
    setData,
    menuState.dateField,
    menuState.issueId,
    dispatch,
    token,
    trackerUid,
    onClose,
  ]);

  // --- Удаление
  const handleConfirmDeleteAll = useCallback(() => {
    const ids = (menuState.durations ?? []).map((i) => i.id);
    if (ids.length) {
      deleteData({
        token,
        dispatch,
        issueId: menuState.issueId,
        ids,
        durations: menuState.durations ?? undefined,
        trackerUid,
      });
    }
    setOpenConfirm(false);
    onClose();
  }, [menuState, token, deleteData, dispatch, onClose, trackerUid]);

  const handleCancelDeleteAll = useCallback(() => setOpenConfirm(false), []);
  const handleDeleteItem = useCallback(
    (item: DurationItem) => {
      deleteData({
        token,
        dispatch,
        issueId: menuState.issueId,
        ids: [item.id],
        durations: [item],
        trackerUid,
      });
      onClose();
    },
    [menuState.issueId, token, deleteData, dispatch, onClose, trackerUid],
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
              {menuState.dateField &&
                headerWeekName[
                  dayOfWeekNameByDate(
                    menuState.dateField,
                  ) as keyof typeof headerWeekName
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
                const row = rows[id] ?? getRowFromItem(item);
                const itemError = validationErrors[id];
                const typeRequired =
                  issueTypes.length > 0 && !row.selectedLabel;

                const startLabel = displayStartTime(item.start);
                return (
                  <Fragment key={item.id}>
                    <Grid size={2}>
                      <Stack spacing={0.5}>
                        <TextField
                          required
                          label="Длительность"
                          name="duration"
                          value={displayDuration(row.durationRaw)}
                          onChange={(e) => handleDurationChange(item, e)}
                          error={Boolean(itemError)}
                          fullWidth
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") handleSaveAllEdits();
                          }}
                        />
                        {startLabel && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ lineHeight: 1.4 }}
                          >
                            {startLabel}
                          </Typography>
                        )}
                      </Stack>
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
                        <>
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
                          {availableRecentTypes.length > 0 && (
                            <Stack spacing={0.5} mt={1}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Последние выбранные типы работ
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                rowGap={1}
                              >
                                {availableRecentTypes.map((label) => (
                                  <Button
                                    key={`${item.id}-${label}`}
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      handleIssueTypeChangeForItem(
                                        item.id,
                                        label,
                                      )
                                    }
                                  >
                                    {label}
                                  </Button>
                                ))}
                              </Stack>
                            </Stack>
                          )}
                        </>
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
                  <>
                    <SelectIssueTypeList
                      issueTypes={issueTypes}
                      handleIssueTypeChange={handleIssueTypeChangeNew}
                      selectedIssueTypeLabel={selectedIssueTypeLabelNew ?? ""}
                      margin="dense"
                      required
                      loading={!loaded}
                    />
                    {availableRecentTypes.length > 0 && (
                      <Stack spacing={0.5} mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          Последние выбранные типы работ
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          rowGap={1}
                        >
                          {availableRecentTypes.map((label) => (
                            <Button
                              key={`new-${label}`}
                              size="small"
                              variant="outlined"
                              onClick={() => handleIssueTypeChangeNew(label)}
                            >
                              {label}
                            </Button>
                          ))}
                        </Stack>
                      </Stack>
                    )}
                  </>
                )}
              </Grid>

              <PlanningInfoSection
                remainTimeMinutes={menuState.remainTimeMinutes}
                duration={newEntry.duration ?? ""}
                riskSection={riskSection}
                showDivider={false}
                renderPlanningContent={(formattedRemaining) => (
                  <Typography variant="body1" noWrap>
                    Осталось времени:
                    <Typography
                      variant="body1"
                      color="warning"
                      component="span"
                      noWrap
                    >
                      {formattedRemaining}
                    </Typography>
                  </Typography>
                )}
              />
              <Grid
                size={12}
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

export default SetTimeSpend;
