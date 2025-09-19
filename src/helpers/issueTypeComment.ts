// src/utils/issueTypeComment.ts
export type IssueType = { label: string; hint?: string };

export const escapeRegExp = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Добавляет метку типа в комментарий:
 * - если пусто — "• {label}"
 * - если есть текст — "\n• {label}"
 * - не дублирует, проверяет именно строку-метку "• label"
 */
export const mergeCommentWithIssueType = (
  comment: string,
  label?: string | null
): string => {
  const base = (comment ?? "").trimEnd();
  const tag = (label ?? "").trim();
  if (!tag) return base;

  const re = new RegExp(`(^|\\n)\\s*•\\s*${escapeRegExp(tag)}(\\s|$)`);
  if (re.test(base)) return base;

  return base ? `${base}\n• ${tag}` : `• ${tag}`;
};

/** Есть ли в комментарии хотя бы одна метка из списка типов (строка-метка "• label") */
export const commentHasAnyIssueType = (
  comment: string,
  list: IssueType[]
): boolean => {
  if (!list?.length) return false;
  const c = comment ?? "";
  return list.some((t) => {
    const re = new RegExp(`(^|\\n)\\s*•\\s*${escapeRegExp(t.label)}(\\s|$)`);
    return re.test(c);
  });
};
