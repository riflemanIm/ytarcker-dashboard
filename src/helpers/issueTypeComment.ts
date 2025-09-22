// src/helpers/issueTypeComment.ts

import type { IssueType } from "@/types/global";

export function buildFinalComment(
  comment: string,
  label?: string | null
): string {
  const base = (comment ?? "").trimEnd();
  const tag = label ? `[ProjectControlWT:${label}]` : "";
  if (!tag) return base;
  return base ? `${base}\n${tag}` : tag;
}

export function stripIssueTypeTags(comment: string): string {
  if (!comment) return "";
  return comment.replace(/\[ProjectControlWT:[^\]]+\]/g, "").trim();
}

export function extractIssueTypeLabel(comment: string): string | null {
  if (!comment) return null;
  const match = comment.match(/\[ProjectControlWT:([^\]]+)\]/);
  return match ? match[1] : null;
}

// ✅ Алиас для совместимости с существующими импортами
export const parseFirstIssueTypeLabel = extractIssueTypeLabel;

/** ✅ Новая функция: есть ли ВООБЩЕ хоть какой-то тег в комментарии */
export function hasAnyIssueTypeTag(comment: string): boolean {
  return /\[ProjectControlWT:[^\]]+\]/.test(comment ?? "");
}

/** Оставляем и эту функцию — «есть ли тег из текущего списка типов» */
export function commentHasAnyIssueType(
  comment: string,
  list: IssueType[]
): boolean {
  if (!comment || !list?.length) return false;
  return list.some((t) =>
    new RegExp(
      `\\[ProjectControlWT:${t.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`
    ).test(comment)
  );
}
