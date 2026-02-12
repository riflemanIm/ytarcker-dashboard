import { parseFirstIssueTypeLabel } from "@/helpers/issueTypeComment";
import { DurationItem, MenuState, TaskItem } from "@/types/global";
import { GridRenderCellParams } from "@mui/x-data-grid";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";

const createEmptyMenuState = (): MenuState => ({
  anchorEl: null,
  issue: null,
  field: null,
  issueId: null,
  checklistItemId: null,
  remainTimeMinutes: undefined,
  workPlanId: null,
  worklogIdInternal: null,
  durations: null,
  dateField: null,
});

type UseTimeSpendCellControlsArgs = {
  dataForRange: TaskItem[];
  fieldKeyForDate: (date: Dayjs) => string;
  getDateForField: (field: string) => Dayjs | null;
};

const normalizeSpace = (s: string) => s.replace(/[\u00A0\u202F]/g, " ");

export const useTimeSpendCellControls = ({
  dataForRange,
  fieldKeyForDate,
  getDateForField,
}: UseTimeSpendCellControlsArgs) => {
  const getDurationsForCell = useCallback(
    (rowId: string | number, field: string): DurationItem[] | null => {
      const matches = dataForRange.filter(
        (r) =>
          String(r.key) === String(rowId) &&
          fieldKeyForDate(dayjs(r.start)) === field,
      );
      if (matches.length === 0) return null;
      const withDurations = matches.find(
        (r) => Array.isArray(r.durations) && r.durations.length,
      );
      if (withDurations?.durations?.length) return withDurations.durations;
      return matches.map((r) => ({
        id: r.id,
        duration: r.duration,
        start: r.start,
        comment: r.comment,
      }));
    },
    [dataForRange, fieldKeyForDate],
  );

  const cellHasAllTags = useCallback(
    (rowId: string | number, field: string): boolean => {
      if (!dataForRange) return true;

      const BAD_TAG_RE =
        /\[\s*ProjectControlWT\s*:\s*Временно\s+не\s*определ[её]н\s*\]/i;

      const rawItems = dataForRange.filter(
        (r) =>
          String(r.key) === String(rowId) &&
          fieldKeyForDate(dayjs(r.start)) === field,
      );

      if (rawItems.length === 0) return false;

      for (const r of rawItems) {
        const durations =
          Array.isArray(r.durations) && r.durations.length ? r.durations : [r];

        for (const d of durations) {
          const commentRaw = (d?.comment ?? "").toString();
          const comment = normalizeSpace(commentRaw).trim();

          if (!comment) return false;
          if (BAD_TAG_RE.test(comment)) return false;

          const tag = parseFirstIssueTypeLabel(comment);
          if (!tag) return false;
        }
      }
      return true;
    },
    [dataForRange, fieldKeyForDate],
  );

  const [menuState, setMenuState] = useState<MenuState>(createEmptyMenuState);
  const [infoState, setInfoState] = useState<MenuState>(createEmptyMenuState);
  const [infoOpen, setInfoOpen] = useState(false);
  const popoverPaperRef = useRef<HTMLDivElement | null>(null);
  const infoCloseTimer = useRef<number | null>(null);

  const clearInfoCloseTimer = useCallback(() => {
    if (infoCloseTimer.current != null) {
      window.clearTimeout(infoCloseTimer.current);
      infoCloseTimer.current = null;
    }
  }, []);

  const closeInfo = useCallback(() => {
    clearInfoCloseTimer();
    setInfoOpen(false);
    setInfoState(createEmptyMenuState());
  }, [clearInfoCloseTimer]);

  const scheduleInfoClose = useCallback(() => {
    clearInfoCloseTimer();
    infoCloseTimer.current = window.setTimeout(() => {
      infoCloseTimer.current = null;
      const anchorHovered = infoState.anchorEl?.matches?.(":hover");
      const popoverHovered = popoverPaperRef.current?.matches?.(":hover");
      if (anchorHovered || popoverHovered) {
        return;
      }
      closeInfo();
    }, 15000);
  }, [clearInfoCloseTimer, closeInfo, infoState.anchorEl]);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, params: GridRenderCellParams) => {
      clearInfoCloseTimer();
      const anchor = event.currentTarget as HTMLElement;
      const durations = getDurationsForCell(params.id, params.field);
      setMenuState({
        anchorEl: anchor,
        issue: params.row.issue.display,
        field: params.field as string,
        issueId: params.row.issueId,
        checklistItemId: params.row.checklistItemId ?? null,
        remainTimeMinutes: params.row.remainTimeMinutes,
        workPlanId: params.row.workPlanId ?? null,
        worklogIdInternal: params.row.worklogIdInternal ?? null,
        durations: durations ?? null,
        dateField: getDateForField(params.field as string),
      });
    },
    [clearInfoCloseTimer, getDateForField, getDurationsForCell],
  );

  const handleMenuClose = useCallback(() => {
    setMenuState(createEmptyMenuState());
  }, []);

  const handleInfoOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, params: GridRenderCellParams) => {
      clearInfoCloseTimer();
      const anchor = event.currentTarget as HTMLElement;
      const durations = getDurationsForCell(params.id, params.field);

      if (!durations || durations.length === 0) {
        closeInfo();
        return;
      }

      closeInfo();

      const nextState: MenuState = {
        anchorEl: anchor,
        issue: params.row.issue.display,
        field: params.field as string,
        issueId: params.row.issueId,
        checklistItemId: params.row.checklistItemId ?? null,
        remainTimeMinutes: params.row.remainTimeMinutes,
        workPlanId: params.row.workPlanId ?? null,
        worklogIdInternal: params.row.worklogIdInternal ?? null,
        durations,
        dateField: getDateForField(params.field as string),
      };

      setInfoState(nextState);
      setInfoOpen(true);
    },
    [
      clearInfoCloseTimer,
      closeInfo,
      getDateForField,
      getDurationsForCell,
    ],
  );

  const handleCellInfoLeave = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      const nextTarget = event?.relatedTarget as Node | null;
      if (
        event &&
        nextTarget &&
        popoverPaperRef.current?.contains(nextTarget)
      ) {
        return;
      }
      scheduleInfoClose();
    },
    [scheduleInfoClose],
  );

  const handlePopoverMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      const anchor = infoState.anchorEl;
      if (anchor && nextTarget && anchor.contains(nextTarget)) {
        return;
      }
      scheduleInfoClose();
    },
    [infoState.anchorEl, scheduleInfoClose],
  );

  const handlePopoverMouseEnter = useCallback(() => {
    clearInfoCloseTimer();
  }, [clearInfoCloseTimer]);

  useEffect(() => {
    return () => {
      clearInfoCloseTimer();
    };
  }, [clearInfoCloseTimer]);

  return {
    cellHasAllTags,
    menuState,
    infoState,
    infoOpen,
    popoverPaperRef,
    handleMenuOpen,
    handleMenuClose,
    handleInfoOpen,
    handleCellInfoLeave,
    handlePopoverMouseEnter,
    handlePopoverMouseLeave,
    closeInfo,
  };
};
