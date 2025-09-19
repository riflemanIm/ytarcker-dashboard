// src/hooks/useIssueTypeTags.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getIssueTypeList } from "@/actions/data";
import type { IssueType } from "@/helpers/issueTypeComment";
import {
  commentHasAnyIssueType,
  mergeCommentWithIssueType,
} from "@/helpers/issueTypeComment";

type IssueTypesState = { issue_type_list: IssueType[]; loaded: boolean };

interface UseIssueTypeTagsParams {
  token: string | null;
  issueKey?: string | number | null; // ключ задачи для загрузки типов
  comment: string; // текущее значение комментария (управляет родитель)
  setComment: (v: string | ((prev: string) => string)) => void;
  // автоподстановка единственного типа — только в "новую запись"
  autoApplySingle?: boolean;
}

export function useIssueTypeTags({
  token,
  issueKey,
  comment,
  setComment,
  autoApplySingle = true,
}: UseIssueTypeTagsParams) {
  const [typesState, setTypesState] = useState<IssueTypesState>({
    issue_type_list: [],
    loaded: true,
  });
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // чтобы не автоподставлять повторно при том же issueKey
  const autoAppliedForKeyRef = useRef<string | number | null>(null);

  // загрузка списка типов при смене issueKey
  useEffect(() => {
    if (issueKey) {
      setTypesState((p) => ({ ...p, loaded: false }));
      getIssueTypeList({
        setLocalState: setTypesState as any,
        token,
        entityKey: issueKey as string,
      });
      // сброс UI селекта
      setSelectedLabel(null);
      // сброс флага авто-вставки при смене задачи
      autoAppliedForKeyRef.current = null;
    } else {
      setTypesState({ issue_type_list: [], loaded: true });
      setSelectedLabel(null);
      autoAppliedForKeyRef.current = null;
    }
  }, [issueKey, token]);

  // автоподстановка: если РОВНО один тип и в комментарии ещё нет ни одной метки — вставить
  useEffect(() => {
    if (!autoApplySingle) return;
    if (!issueKey) return;
    if (!typesState.loaded) return;
    if (typesState.issue_type_list.length !== 1) return;
    if (autoAppliedForKeyRef.current === issueKey) return;

    // уже есть любая метка? тогда не подставляем
    if (commentHasAnyIssueType(comment, typesState.issue_type_list)) return;

    const only = typesState.issue_type_list[0].label;
    setComment((prev) => mergeCommentWithIssueType(prev, only));
    autoAppliedForKeyRef.current = issueKey;
  }, [autoApplySingle, issueKey, typesState, comment, setComment]);

  // выбор в селекте — сразу вставляем метку в комментарий и очищаем селект
  const onSelect = useCallback(
    (label: string) => {
      setSelectedLabel(label || null);
      setComment((prev) => mergeCommentWithIssueType(prev, label));
      // очистим селект (удобно добавлять подряд)
      setTimeout(() => setSelectedLabel(null), 0);
    },
    [setComment]
  );

  const issueTypes = typesState.issue_type_list;
  const loading = !typesState.loaded;

  const hasTypeInComment = useMemo(
    () => commentHasAnyIssueType(comment, issueTypes),
    [comment, issueTypes]
  );

  // для удобной прокидки в SelectIssueTypeList
  const selectError = useMemo(() => {
    if (!issueTypes.length) return false;
    return !hasTypeInComment;
  }, [issueTypes.length, hasTypeInComment]);

  const selectHelperText = selectError ? "Укажите тип задачи" : "";

  return {
    // данные
    issueTypes,
    loading,

    // селект
    selectedLabel,
    onSelect,

    // проверка обязательности
    hasTypeInComment,
    selectError,
    selectHelperText,

    // управление извне при открытии/сбросах
    reset: () => {
      setSelectedLabel(null);
      autoAppliedForKeyRef.current = null;
    },
  };
}
