import { useState, Fragment, ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { searchIssues } from "@/actions/data";
import { Issue } from "@/types/global";
import IssueDisplay from "./IssueDisplay";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenizeQuery = (query: string) =>
  query
    .toLowerCase()
    .split(/[\s,.;!?(){}\[\]<>/\\]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const buildHighlightRegex = (query: string): RegExp | null => {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return null;

  const parts = tokens.map((token) => {
    const minStem = Math.max(3, Math.ceil(token.length * 0.6));
    const stem = token.slice(0, minStem);
    return `${escapeRegExp(stem)}[\\w-]*`;
  });

  return new RegExp(parts.join("|"), "gi");
};

const highlightText = (text: string, query: string): ReactNode => {
  if (!text) return null;
  const regex = buildHighlightRegex(query);
  if (!regex) return text;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    nodes.push(
      <Box
        component="mark"
        key={`${start}-${end}`}
        sx={{
          backgroundColor: "rgba(255, 235, 59, 0.5)",
          color: "inherit",
          px: 0.25,
          borderRadius: 0.5,
        }}
      >
        {text.slice(start, end)}
      </Box>
    );
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const stripDescription = (input?: string) => {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const buildSnippet = (text: string, query: string, length = 360) => {
  if (!text || !query.trim()) return "";
  const clean = stripDescription(text);
  if (!clean) return "";

  const regex = buildHighlightRegex(query);
  if (!regex) return "";

  const match = regex.exec(clean);
  if (!match) return "";

  const start = Math.max(0, match.index - Math.floor(length / 2));
  const end = Math.min(clean.length, start + length);
  const snippet = clean.slice(start, end).trim();

  return `${start > 0 ? "… " : ""}${snippet}${end < clean.length ? " …" : ""}`;
};

interface SearchIssuesProps {
  token: string | null;
}

const SearchIssues = ({ token }: SearchIssuesProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedQuery, setAppliedQuery] = useState("");

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Нужен токен для поиска. Выполните вход.");
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Введите текст запроса");
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const issues = await searchIssues({ token, searchStr: trimmedQuery });
      setResults(issues);
      setHasSearched(true);
      setAppliedQuery(trimmedQuery);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось выполнить поиск задач";
      setError(message);
      setResults([]);
      setHasSearched(false);
      setAppliedQuery("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 3,
        gap: 2,
      }}
    >
      <Stack
        component="form"
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        onSubmit={handleSearch}
      >
        <TextField
          fullWidth
          label="Ключ, название или текст задачи"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={!token || loading}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!token || loading || query.trim().length === 0}
        >
          Найти
        </Button>
      </Stack>

      {!token && (
        <Alert severity="info">
          Авторизуйтесь, чтобы использовать поиск по задачам.
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {loading && <LinearProgress />}

      <Stack sx={{ flex: 1, overflowY: "auto" }} spacing={2}>
        {hasSearched && !loading && results.length === 0 && (
          <Alert severity="warning">
            По запросу ничего не найдено, попробуйте изменить текст поиска.
          </Alert>
        )}

        {results.length > 0 && (
          <List disablePadding>
            {results.map((issue, index) => {
              const displayText = issue.summary
                ? `${issue.key} — ${issue.summary}`
                : issue.key;
              const descriptionSnippet = buildSnippet(
                issue.description ?? "",
                appliedQuery
              );
              const commentSnippet = buildSnippet(
                issue.commentsText ?? "",
                appliedQuery
              );
              return (
                <Fragment key={issue.key}>
                  <ListItem alignItems="flex-start">
                    <Stack spacing={1} sx={{ width: "100%" }}>
                      <IssueDisplay
                        display={
                          appliedQuery
                            ? highlightText(displayText, appliedQuery)
                            : displayText
                        }
                        href={`https://tracker.yandex.ru/${issue.key}`}
                        fio={
                          issue.assignee
                            ? `Исполнитель: ${issue.assignee}`
                            : undefined
                        }
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {issue.status && (
                          <Chip size="small" label={issue.status} />
                        )}
                        {issue.queue && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={issue.queue}
                          />
                        )}
                        <Chip size="small" variant="outlined" label={issue.key} />
                      </Stack>
                      {descriptionSnippet && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            Описание:{" "}
                          </Box>
                          {appliedQuery
                            ? highlightText(descriptionSnippet, appliedQuery)
                            : descriptionSnippet}
                        </Typography>
                      )}
                      {commentSnippet && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            Комментарии:{" "}
                          </Box>
                          {appliedQuery
                            ? highlightText(commentSnippet, appliedQuery)
                            : commentSnippet}
                        </Typography>
                      )}
                    </Stack>
                  </ListItem>
                  {index < results.length - 1 && <Divider component="li" />}
                </Fragment>
              );
            })}
          </List>
        )}
      </Stack>
    </Paper>
  );
};

export default SearchIssues;
