// src/helpers/issueTypeComment.ts

import type { IssueType } from "@/types/global";

export type RiskState = {
  deadlineOk: boolean;
  needUpgradeEstimate: boolean;
  makeTaskFaster: boolean;
};

const ISSUE_TYPE_TAG = "ProjectControlWT";
const WORKPLAN_TAG = "YT_TL_WORKPLAN_ID";

export function buildFinalComment(
  comment: string,
  label?: string | null,
): string {
  const base = (comment ?? "").trimEnd();
  const tag = label ? `[${ISSUE_TYPE_TAG}:${label}]` : "";
  if (!tag) return base;
  return base ? `${base}\n${tag}` : tag;
}

export function buildWorkPlanIdTag(
  workPlanId?: string | number | null,
): string {
  if (workPlanId == null || workPlanId === "") return "";
  return `[${WORKPLAN_TAG}:${workPlanId}]`;
}

const appendTag = (base: string, tag: string): string => {
  if (!tag) return base;
  return base ? `${base}\n${tag}` : tag;
};

export function stripIssueTypeTags(comment: string): string {
  if (!comment) return "";
  return comment
    .replace(/\[ProjectControlWT:[^\]]+\]/g, "")
    .replace(/\[YT_TL_WORKPLAN_ID:[^\]]+\]/g, "")
    .replace(/\[YT_TL_WORKLOG_ID:[^\]]*\]/g, "")
    .trim();
}

export function extractIssueTypeLabel(comment: string): string | null {
  if (!comment) return null;
  const match = comment.match(/\[ProjectControlWT:([^\]]+)\]/);
  return match ? match[1] : null;
}

export function extractWorkPlanId(comment: string): string | null {
  if (!comment) return null;
  const match =
    comment.match(/\[YT_TL_WORKPLAN_ID:([^\]]+)\]/) ??
    comment.match(/\[YT_TL_WORKLOG_ID:([^\]]+)\]/);
  return match ? match[1] : null;
}

export function parseRiskBlock(comment: string): {
  deadlineOk: boolean;
  needUpgradeEstimate: boolean;
  makeTaskFaster: boolean;
} {
  const match = (comment ?? "").match(/\[Risks:\s*\{\s*([\s\S]*?)\}\s*\]/m);
  if (!match) {
    return {
      deadlineOk: true,
      needUpgradeEstimate: false,
      makeTaskFaster: false,
    };
  }
  const body = match[1] ?? "";
  const readFlag = (key: string, fallback: boolean) => {
    const re = new RegExp(`${key}\\s*:\\s*(true|false)`, "i");
    const m = body.match(re);
    if (!m) return fallback;
    return m[1].toLowerCase() === "true";
  };
  return {
    deadlineOk: readFlag("deadlineOk", true),
    needUpgradeEstimate: readFlag("needUpgradeEstimate", false),
    makeTaskFaster: readFlag("makeTaskFaster", false),
  };
}

export function buildRiskBlock(riskState: RiskState): string {
  return `[Risks: { deadlineOk: ${riskState.deadlineOk}, needUpgradeEstimate: ${riskState.needUpgradeEstimate}, makeTaskFaster: ${riskState.makeTaskFaster} }]`;
}

export function appendRisksToComment(
  comment: string,
  riskState: RiskState,
): string {
  const cleaned = stripRiskBlock(comment);
  const riskBlock = buildRiskBlock(riskState);
  return cleaned ? `${cleaned}\n${riskBlock}` : riskBlock;
}

export function buildCommentWithTags(
  comment: string,
  label?: string | null,
  riskState?: RiskState | null,
  workPlanId?: string | number | null,
): string {
  const withType = buildFinalComment(comment, label ?? undefined);
  const withWorkPlan = appendTag(withType, buildWorkPlanIdTag(workPlanId));
  if (!riskState) return withWorkPlan;
  return appendRisksToComment(withWorkPlan, riskState);
}

export function stripRiskBlock(comment: string): string {
  return (comment ?? "")
    .replace(/\n?\[Risks:\s*\{[\s\S]*?\}\s*\]/m, "")
    .trimEnd();
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
  list: IssueType[],
): boolean {
  if (!comment || !list?.length) return false;
  return list.some((t) =>
    new RegExp(
      `\\[${ISSUE_TYPE_TAG}:${t.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`,
    ).test(comment),
  );
}

export function parseCommentForEditing(
  comment: string,
  issueTypes?: IssueType[],
): { cleanComment: string; selectedLabel: string | null } {
  const parsedLabel = extractIssueTypeLabel(comment ?? "") ?? null;
  const cleanComment = stripRiskBlock(stripIssueTypeTags(comment ?? ""));
  if (!issueTypes || issueTypes.length === 0) {
    return { cleanComment, selectedLabel: parsedLabel };
  }
  const selectedLabel = issueTypes.some((t) => t.label === parsedLabel)
    ? parsedLabel
    : null;
  return { cleanComment, selectedLabel };
}
