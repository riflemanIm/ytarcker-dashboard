import { useState, useEffect, Fragment, ReactNode, ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getQueues, searchIssues } from "@/actions/data";
import { Issue, QueueInfo } from "@/types/global";
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
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

const ALL_QUEUES_VALUE = "all";
const DEFAULT_PER_PAGE = 20;
const PER_PAGE_OPTIONS = [10, 20, 50];

const SearchIssues = ({ token }: SearchIssuesProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(ALL_QUEUES_VALUE);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setQueues([]);
      setSelectedQueue(ALL_QUEUES_VALUE);
      setQueuesLoading(false);
      return undefined;
    }

    setQueuesLoading(true);
    getQueues(token)
      .then((data) => {
        if (isMounted) {
          setQueues(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQueues([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setQueuesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const executeSearch = async (
    searchText: string,
    pageToRequest = 1,
    perPageToRequest = perPage
  ) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queue =
        selectedQueue === ALL_QUEUES_VALUE ? undefined : selectedQueue;

      const response = await searchIssues({
        token,
        searchStr: searchText,
        queue,
        page: pageToRequest,
        perPage: perPageToRequest,
      });
      setResults(response.issues);
      setHasSearched(true);
      setAppliedQuery(searchText);
      setPage(response.page ?? pageToRequest);
      setPerPage(response.perPage ?? perPageToRequest);
      setTotal(response.total ?? response.issues.length);
      setHasMore(response.hasMore ?? false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось выполнить поиск задач";
      setError(message);
      setResults([]);
      setHasSearched(false);
      setAppliedQuery("");
      setTotal(0);
      setPage(1);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

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
      setTotal(0);
      setPage(1);
      setHasMore(false);
      return;
    }

    await executeSearch(trimmedQuery, 1, perPage);
  };

  const handleQueueChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setSelectedQueue(event.target.value);
  };

  const handlePageChange = (_event: ChangeEvent<unknown>, newPage: number) => {
    if (!appliedQuery || !token) return;
    executeSearch(appliedQuery, newPage, perPage);
  };

  const handlePerPageChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const parsed = Number(event.target.value);
    const nextPerPage = Number.isFinite(parsed) ? parsed : DEFAULT_PER_PAGE;
    setPerPage(nextPerPage);
    setPage(1);
    if (!appliedQuery || !token) {
      return;
    }
    executeSearch(appliedQuery, 1, nextPerPage);
  };

  const knownTotalPages = total > 0 ? Math.ceil(total / perPage) : null;
  let paginationCount = knownTotalPages ?? page;
  if (hasMore) {
    paginationCount = Math.max(paginationCount, page + 1);
  }
  paginationCount = Math.max(1, paginationCount);
  const currentPage = Math.min(page, paginationCount);
  const totalLabel =
    total > 0 && !hasMore
      ? total
      : hasMore
        ? `${(page - 1) * perPage + results.length}+`
        : (page - 1) * perPage + results.length;

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
          select
          label="Очередь"
          value={selectedQueue}
          onChange={handleQueueChange}
          disabled={!token || queuesLoading}
          sx={{ minWidth: { xs: "100%", md: 220 } }}
        >
          <MenuItem value={ALL_QUEUES_VALUE}>Все очереди</MenuItem>
          {queues.map((queue) => (
            <MenuItem key={queue.key} value={queue.key}>
              {queue.name ?? queue.key}
            </MenuItem>
          ))}
        </TextField>
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

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Stack
          sx={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}
          spacing={2}
        >
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
                          <Chip
                            size="small"
                            variant="outlined"
                            label={issue.key}
                          />
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
      </Box>
      {results.length > 0 && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Pagination
            count={paginationCount}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            //showFirstButton
            //showLastButton
            disabled={loading}
          />
          <TextField
            select
            label="На странице"
            value={String(perPage)}
            onChange={handlePerPageChange}
            size="small"
            sx={{ width: 100 }}
            disabled={loading}
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            Найдено задач: {totalLabel}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
};

export default SearchIssues;
