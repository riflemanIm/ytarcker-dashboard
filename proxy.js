import express from "express";
import axios from "axios";
import cors from "cors";
import https from "https";

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function normalizeOffset(str) {
  if (!str) return str;
  // Приводим "+0000" к "+00:00" (и аналогичные "+0300" → "+03:00")
  return str.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
}

function parseDateSafe(str) {
  if (!str) return NaN;
  const norm = normalizeOffset(str);
  let ts = Date.parse(norm);
  if (isNaN(ts)) {
    // если TZ отсутствует совсем – считаем, что это UTC
    ts = Date.parse(norm + "Z");
  }
  return ts;
}

function toMSKISO(str) {
  const ts = parseDateSafe(str);
  if (isNaN(ts)) return str; // не ломаем, если пришло что-то необычное
  const d = new Date(ts + MSK_OFFSET_MS);

  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const MM = pad(d.getUTCMinutes());
  const SS = pad(d.getUTCSeconds());
  const mmm = pad(d.getUTCMilliseconds(), 3);

  return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}.${mmm}+03:00`;
}
// Сдвигаем startDate на -3 часа (UTC коррекция)
const shiftHours = (dateStr, hours) => {
  const ts = Date.parse(dateStr);
  if (isNaN(ts)) return dateStr;
  const shifted = new Date(ts + hours * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetries = async (factory, { retries = 3, baseDelay = 500 } = {}) => {
  let attempt = 0;
  while (true) {
    try {
      return await factory();
    } catch (error) {
      const status = error?.response?.status;
      if (status !== 429 || attempt >= retries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
      attempt += 1;
    }
  }
};

const mapWithConcurrency = async (items, mapper, limit = 5) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const result = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      let index;
      if (cursor >= items.length) break;
      index = cursor;
      cursor += 1;
      result[index] = await mapper(items[index], index);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }).map(
    () => worker(),
  );
  await Promise.all(workers);
  return result;
};

const headers = (token) => ({
  headers: {
    Authorization: `OAuth ${token}`,
    "X-Org-ID": "8063720",
    Host: "api.tracker.yandex.net",
  },
});
const app = express();
app.use(cors());
app.use(express.json());

const ENABLE_INTERNAL_UPDATES = false;

const SEARCH_DEFAULT_PER_PAGE = 20;
const SEARCH_MAX_PER_PAGE = 50;

app.get("/api/issues", async (req, res) => {
  let { token, startDate, endDate, userId, login } = req.query;

  try {
    if (token) {
      // Очистка параметров
      userId =
        userId != null && userId !== "undefined" && userId !== "null"
          ? userId
          : null;
      login =
        login != null && login !== "undefined" && login !== "null"
          ? login
          : null;

      // Форматирование диапазона запроса (строки остаются строками)
      const from = shiftHours(startDate, -3);
      const to = `${endDate}T23:59`;
      // console.log(
      //   "from",
      //   from,
      //   "to",
      //   to,

      //   "userId",
      //   userId,
      //   "login",
      //   login
      // );
      // Формируем тело запроса
      let requestBody = {
        start: {
          from,
          to,
        },
      };
      // Если логин передан, добавляем его в запрос
      if (login) {
        requestBody.createdBy = login;
      } else if (userId) {
        requestBody.createdBy = userId;
      }

      const url =
        "https://api.tracker.yandex.net/v2/worklog/_search?perPage=10000";
      const response = await axios.post(url, requestBody, headers(token));

      // Фильтрация данных с использованием уже вычисленных timestamp'ов

      // const data = response.data.filter((it) =>
      //   filterDataByDateRange(it.start, startTimestamp, endTimestamp)
      // );
      const raw = response.data;

      // Приводим время к MSK
      const data = raw.map((it) => ({
        ...it,
        start: toMSKISO(it.start),
        createdAt: toMSKISO(it.createdAt),
        updatedAt: toMSKISO(it.updatedAt),
      }));

      // Формируем список пользователей без повторов
      let users = data.map((it) => ({
        id: `${it.updatedBy.id}`,
        name: it.updatedBy.display,
      }));
      users = [...new Map(users.map((item) => [item.id, item])).values()];

      res.json({ data, users });
    } else {
      res.status(400).json({ error: "token not pass" });
    }
  } catch (error) {
    console.error("[/api/issues] error:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post("/api/add_time", async (req, res) => {
  let { token, issueId, start, duration, comment } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ error: "token not passed" });
    }

    // Добавляем новый worklog
    const url = `https://api.tracker.yandex.net/v2/issues/${issueId}/worklog`;
    const { data } = await axios.post(
      url,
      { start, duration, comment },
      headers(token),
    );

    res.json(data);
  } catch (error) {
    console.error("[Ошибка в методе /api/add_time]:", error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch("/api/edit_time", async (req, res) => {
  let { token, issueId, worklogId, duration, comment } = req.body;
  try {
    if (!token) {
      return res.status(400).json({ error: "token not passed" });
    }
    if (!issueId || !worklogId || !duration) {
      return res
        .status(400)
        .json({ error: "issueId, worklogId and duration are required" });
    }

    const url = `https://api.tracker.yandex.net/v2/issues/${issueId}/worklog/${worklogId}`;
    const payload = {
      duration,
      comment,
    };
    const response = await axios.patch(url, payload, headers(token));
    res.json(response.data);
  } catch (error) {
    console.error("[Ошибка в методе /api/edit_time]:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post("/api/delete_all", async (req, res) => {
  let { token, issueId, ids } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ error: "token not passed" });
    }

    if (Array.isArray(ids) && ids.length) {
      // Удаляем старые worklogs с обработкой ошибок
      await Promise.all(
        ids.map((id) =>
          axios
            .delete(
              `https://api.tracker.yandex.net/v2/issues/${issueId}/worklog/${id}`,
              headers(token),
            )
            .catch((err) => {
              console.error(`Ошибка удаления worklog ${id}:`, err.message);
              throw err;
            }),
        ),
      );
    }

    res.json(true);
  } catch (error) {
    console.error("[Ошибка в методе /api/add_time]:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post("/api/worklog_update", async (req, res) => {
  try {
    const {
      token,
      taskKey,
      action,
      duration,
      durationMinutes,
      start,
      startDate,
      comment,
      worklogId,
      trackerUid,
      checklistItemId,
      deadlineOk,
      needUpgradeEstimate,
      makeTaskFaster,
      ids,
      items,
    } = req.body ?? {};

    if (!token) {
      return res.status(400).json({ error: "token not passed" });
    }
    if (typeof taskKey !== "string" || taskKey.length === 0) {
      return res.status(400).json({
        message: "Missing or invalid field 'taskKey'. It must be a string.",
      });
    }
    if (![0, 1, 2].includes(action)) {
      return res.status(400).json({
        message: "Field 'action' must be 0 (Add), 1 (Edit), or 2 (Delete).",
      });
    }

    const requireInternalFields = (payload) => {
      if (typeof payload.durationMinutes !== "number") {
        return "Missing or invalid field 'durationMinutes'. It must be a number.";
      }
      if (
        typeof payload.startDate !== "string" ||
        payload.startDate.length === 0
      ) {
        return "Missing or invalid field 'startDate'. It must be a string.";
      }
      if (typeof payload.comment !== "string") {
        return "Missing or invalid field 'comment'. It must be a string.";
      }
      if (
        typeof payload.trackerUid !== "string" ||
        payload.trackerUid.length === 0
      ) {
        return "Missing or invalid field 'trackerUid'. It must be a string.";
      }
      if (typeof payload.deadlineOk !== "boolean") {
        return "Missing or invalid field 'deadlineOk'. It must be a boolean.";
      }
      if (typeof payload.needUpgradeEstimate !== "boolean") {
        return "Missing or invalid field 'needUpgradeEstimate'. It must be a boolean.";
      }
      if (typeof payload.makeTaskFaster !== "boolean") {
        return "Missing or invalid field 'makeTaskFaster'. It must be a boolean.";
      }
      return null;
    };

    const sendInternal = async (payload) => {
      console.log("ENABLE_INTERNAL_UPDATES", ENABLE_INTERNAL_UPDATES);
      if (!ENABLE_INTERNAL_UPDATES) {
        return { data: { skipped: true } };
      }
      return axios.post(
        "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/tlworklogupdate",
        payload,
        { timeout: 15000 },
      );
    };

    if (action === 0 || action === 1) {
      if (typeof duration !== "string" || duration.length === 0) {
        return res.status(400).json({
          message: "Missing or invalid field 'duration'. It must be a string.",
        });
      }
      if (typeof start !== "string" || start.length === 0) {
        return res.status(400).json({
          message: "Missing or invalid field 'start'. It must be a string.",
        });
      }
      if (action === 1 && !Number.isInteger(Number(worklogId))) {
        return res.status(400).json({
          message:
            "Field 'worklogId' is required and must be an integer for Edit action.",
        });
      }
      const internalError = requireInternalFields({
        durationMinutes,
        startDate,
        comment,
        trackerUid,
        deadlineOk,
        needUpgradeEstimate,
        makeTaskFaster,
      });
      if (internalError) {
        return res.status(400).json({ message: internalError });
      }

      const trackerUrl =
        action === 0
          ? `https://api.tracker.yandex.net/v2/issues/${taskKey}/worklog`
          : `https://api.tracker.yandex.net/v2/issues/${taskKey}/worklog/${worklogId}`;
      const trackerPayload =
        action === 0 ? { start, duration, comment } : { duration, comment };

      const trackerResponse =
        action === 0
          ? await axios.post(trackerUrl, trackerPayload, headers(token))
          : await axios.patch(trackerUrl, trackerPayload, headers(token));

      await sendInternal({
        taskKey,
        duration: durationMinutes,
        startDate,
        deadlineOk,
        needUpgradeEstimate,
        makeTaskFaster,
        comment,
        action,
        checklistItemId,
        trackerUid,
        worklogId: action === 1 ? Number(worklogId) : undefined,
      });

      return res.json(trackerResponse.data);
    }

    const isBatch = Array.isArray(ids) && ids.length > 0;
    const deleteIds = isBatch
      ? ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [];

    if (!isBatch && !Number.isInteger(Number(worklogId))) {
      return res.status(400).json({
        message:
          "Field 'worklogId' is required and must be an integer for Delete action.",
      });
    }

    if (isBatch) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Field 'items' must be a non-empty array for batch delete.",
        });
      }
      const internalErrors = items
        .map((item) =>
          requireInternalFields({
            durationMinutes: item?.durationMinutes,
            startDate: item?.startDate,
            comment: item?.comment,
            trackerUid,
            deadlineOk,
            needUpgradeEstimate,
            makeTaskFaster,
          }),
        )
        .filter(Boolean);
      if (internalErrors.length > 0) {
        return res.status(400).json({ message: internalErrors[0] });
      }

      await Promise.all(
        deleteIds.map((id) =>
          axios.delete(
            `https://api.tracker.yandex.net/v2/issues/${taskKey}/worklog/${id}`,
            headers(token),
          ),
        ),
      );

      await Promise.all(
        items.map((item) =>
          sendInternal({
            taskKey,
            duration: item.durationMinutes,
            startDate: item.startDate,
            deadlineOk,
            needUpgradeEstimate,
            makeTaskFaster,
            comment: item.comment ?? "",
            action: 2,
            checklistItemId: item.checklistItemId ?? checklistItemId,
            trackerUid,
            worklogId: Number(item.worklogId),
          }),
        ),
      );

      return res.json(true);
    }

    const internalError = requireInternalFields({
      durationMinutes,
      startDate,
      comment,
      trackerUid,
      deadlineOk,
      needUpgradeEstimate,
      makeTaskFaster,
    });
    if (internalError) {
      return res.status(400).json({ message: internalError });
    }

    await axios.delete(
      `https://api.tracker.yandex.net/v2/issues/${taskKey}/worklog/${worklogId}`,
      headers(token),
    );

    await sendInternal({
      taskKey,
      duration: durationMinutes,
      startDate,
      deadlineOk,
      needUpgradeEstimate,
      makeTaskFaster,
      comment,
      action: 2,
      checklistItemId,
      trackerUid,
      worklogId: Number(worklogId),
    });

    return res.json(true);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/worklog_update] error:", payload);
    res.status(status).json(payload);
  }
});
// Получить все задачи пользователя, отсортированные по последнему обновлению
const MAX_TRACKER_PER_PAGE = 1000;
const DEFAULT_TRACKER_PAGE = 1;
const DEFAULT_TRACKER_PER_PAGE = 20;

const toNumberOrFallback = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trackerSearchRequest = async (token, body, options = {}) => {
  const requestedPage = toNumberOrFallback(options.page, DEFAULT_TRACKER_PAGE);
  const requestedPerPage = toNumberOrFallback(
    options.perPage,
    DEFAULT_TRACKER_PER_PAGE,
  );
  const page = Math.max(1, Math.floor(requestedPage));
  const perPage = Math.max(
    1,
    Math.min(MAX_TRACKER_PER_PAGE, Math.floor(requestedPerPage)),
  );

  const url = `https://api.tracker.yandex.net/v3/issues/_search?perPage=${perPage}&page=${page}`;
  const response = await withRetries(
    () => axios.post(url, body, headers(token)),
    { retries: 4, baseDelay: 600 },
  );
  const payload = response.data ?? {};

  let issues = [];
  if (Array.isArray(payload)) {
    issues = payload;
  } else if (Array.isArray(payload?.issues)) {
    issues = payload.issues;
  }

  const extractNumber = (...values) => {
    for (const value of values) {
      const num = Number(value);
      if (Number.isFinite(num)) {
        return num;
      }
    }
    return undefined;
  };

  const meta = payload?.meta ?? payload?._meta ?? {};
  const totalFromPayload = extractNumber(
    payload?.total,
    payload?.totalCount,
    meta?.total,
    meta?.totalCount,
  );
  const total = totalFromPayload ?? issues.length;
  const resolvedPage = extractNumber(payload?.page, meta?.page) ?? page;
  const resolvedPerPage =
    extractNumber(payload?.perPage, payload?.pageSize, meta?.perPage) ??
    perPage;

  const hasMore =
    typeof totalFromPayload === "number"
      ? totalFromPayload > resolvedPage * resolvedPerPage
      : issues.length === resolvedPerPage;

  return {
    issues,
    total,
    page: resolvedPage,
    perPage: resolvedPerPage,
    hasMore,
  };
};

const searchTracker = (token, filter, options = {}) => {
  const mergedOptions = {
    perPage: MAX_TRACKER_PER_PAGE,
    ...options,
  };
  return trackerSearchRequest(
    token,
    { filter, order: "-updated" },
    mergedOptions,
  ).then((result) => result.issues);
};

const searchTrackerByText = (token, text, queue, options) => {
  const queryParts = [];
  if (queue) {
    queryParts.push(`queue:${queue}`);
  }
  queryParts.push(text);
  const body = { query: queryParts.join(" ").trim(), order: "-updated" };
  return trackerSearchRequest(token, body, options);
};

const fetchIssueComments = async (token, issueId) => {
  if (!issueId) return "";
  try {
    const { data } = await withRetries(
      () =>
        axios.get(
          `https://api.tracker.yandex.net/v2/issues/${issueId}/comments`,
          headers(token),
        ),
      { retries: 4, baseDelay: 600 },
    );
    if (!Array.isArray(data)) return "";
    return data
      .map((comment) => comment.text ?? comment.textHtml ?? "")
      .join("\n");
  } catch (error) {
    console.error("[fetchIssueComments] error:", error.response, error.message);
    return "";
  }
};

app.get("/api/user_issues", async (req, res) => {
  const { token, userId, login } = req.query;

  // Проверяем токен
  if (!token) {
    return res.status(400).json({ error: "token not passed" });
  }

  let user;
  if (login && login !== "undefined" && login !== "null") {
    user = login;
  } else if (userId && userId !== "undefined" && userId !== "null") {
    user = userId;
  } else {
    return res
      .status(400)
      .json({ error: "Either userId or login must be provided" });
  }

  try {
    const [assignedNow, createdByMe] = await Promise.all([
      searchTracker(token, { assignee: user }), // назначены на меня
      searchTracker(token, { createdBy: user }), // созданы мной
    ]);
    const uniqueMap = new Map();
    [...assignedNow, ...createdByMe].forEach((issue) => {
      uniqueMap.set(issue.key, {
        key: issue.key,
        summary: issue.summary,
      });
    });

    res.json({ issues: Array.from(uniqueMap.values()) });
  } catch (error) {
    console.error("[Ошибка в методе /api/user_issues]:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get("/api/queues", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "token not passed" });
  }

  try {
    const response = await axios.get(
      "https://api.tracker.yandex.net/v2/queues?perPage=1000",
      headers(token),
    );
    const payload = Array.isArray(response.data) ? response.data : [];
    const queues = payload.map((queue) => ({
      id: String(queue.id ?? ""),
      key: queue.key,
      name: queue.name ?? queue.display ?? queue.key,
    }));
    res.json({ queues });
  } catch (error) {
    console.error("[Ошибка в методе /api/queues]:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get("/api/search_issues", async (req, res) => {
  const {
    token,
    search_str: searchStrRaw,
    queue: queueRaw,
    page: pageRaw,
    per_page: perPageRaw,
    perPage: perPageAltRaw,
  } = req.query;

  if (!token) {
    return res.status(400).json({ error: "token not passed" });
  }

  const searchStr =
    typeof searchStrRaw === "string" ? searchStrRaw.trim() : undefined;

  if (!searchStr) {
    return res.status(400).json({ error: "search_str must be provided" });
  }

  const queueValue =
    typeof queueRaw === "string" && queueRaw.trim().length
      ? queueRaw.trim()
      : undefined;
  const queue =
    queueValue && queueValue.toLowerCase() !== "all" ? queueValue : undefined;

  const pickPositiveInt = (value, fallback) => {
    const source = Array.isArray(value) ? value[0] : value;
    if (typeof source !== "string" && typeof source !== "number") {
      return fallback;
    }
    const parsed = Number(source);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : fallback;
  };

  const page = pickPositiveInt(pageRaw, 1);
  const perPageCandidate = perPageRaw ?? perPageAltRaw;
  const requestedPerPage = pickPositiveInt(
    perPageCandidate,
    SEARCH_DEFAULT_PER_PAGE,
  );
  const perPage = Math.min(SEARCH_MAX_PER_PAGE, requestedPerPage);

  try {
    const searchResult = await searchTrackerByText(token, searchStr, queue, {
      page,
      perPage,
    });

    const normalized = await mapWithConcurrency(
      searchResult.issues,
      async (issue) => ({
        key: issue.key,
        summary: issue.summary,
        status: issue.status?.display,
        queue: issue.queue?.key,
        assignee: issue.assignee?.display,
        description: issue.description ?? issue?.descriptionHtml ?? "",
        commentsText: await fetchIssueComments(token, issue.id),
      }),
    );

    res.json({
      issues: normalized,
      total: searchResult.total,
      page: searchResult.page,
      perPage: searchResult.perPage,
      hasMore:
        searchResult.hasMore ||
        (normalized.length === searchResult.perPage && normalized.length > 0),
    });
  } catch (error) {
    console.error("[Ошибка в методе /api/search_issues]:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get("/api/issue_type_list", async (req, res) => {
  const { token, entityKey, email } = req.query;

  if (!token) return res.status(400).json({ error: "token not passed" });
  if (!entityKey || entityKey === "undefined" || entityKey === "null")
    return res.status(400).json({ error: "entityKey not passed" });
  if (!email || email === "undefined" || email === "null")
    return res.status(400).json({ error: "Either email must be provided" });

  try {
    // Отключаем проверку TLS ТОЛЬКО для этого запроса
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/projectcontrolwtlist",
      { entityKey, email },
      {
        httpsAgent,
        timeout: 15000,
      },
    );

    res.json({ issue_type_list: resp.data });
  } catch (error) {
    // Расширенная диагностика
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/issue_type_list] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_sprints", async (req, res) => {
  try {
    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/gettlsprint",
      {},
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_sprints] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_groups", async (req, res) => {
  try {
    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/gettlgroup",
      {},
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_groups] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_roles", async (req, res) => {
  try {
    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/gettldictroles",
      {},
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_roles] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_projects", async (req, res) => {
  try {
    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/gettlprojects",
      {},
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_projects] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_group_patients", async (req, res) => {
  try {
    const { groupIds } = req.body ?? {};
    const isValidGroupIds =
      Array.isArray(groupIds) && groupIds.every((id) => Number.isInteger(id));

    if (!isValidGroupIds) {
      return res.status(400).json({
        message:
          "Missing or invalid field 'groupIds'. It must be an array of integers.",
      });
    }

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/gettlgrouppatients",
      { groupIds },
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_group_patients] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_tasklist", async (req, res) => {
  try {
    const {
      trackerUids = [],
      projectIds = [],
      roleIds = [],
      groupIds = [],
    } = req.body ?? {};

    const isValidStringArray =
      Array.isArray(trackerUids) &&
      trackerUids.every((id) => typeof id === "string");
    const isValidProjectIds =
      Array.isArray(projectIds) &&
      projectIds.every((id) => Number.isInteger(id));
    const isValidRoleIds =
      Array.isArray(roleIds) && roleIds.every((id) => Number.isInteger(id));
    const isValidGroupIds =
      Array.isArray(groupIds) && groupIds.every((id) => Number.isInteger(id));

    if (!isValidStringArray) {
      return res.status(400).json({
        message: "Field 'trackerUids' must be an array of strings.",
      });
    }
    if (!isValidProjectIds) {
      return res.status(400).json({
        message: "Field 'projectIds' must be an array of integers.",
      });
    }
    if (!isValidRoleIds) {
      return res.status(400).json({
        message: "Field 'roleIds' must be an array of integers.",
      });
    }
    if (!isValidGroupIds) {
      return res.status(400).json({
        message: "Field 'groupIds' must be an array of integers.",
      });
    }

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/gettasklist",
      { trackerUids, projectIds, roleIds, groupIds },
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_tasklist] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_workplan", async (req, res) => {
  try {
    const {
      sprintId,
      trackerUids = [],
      projectIds = [],
      roleIds = [],
      groupIds = [],
    } = req.body ?? {};

    if (!Number.isInteger(sprintId)) {
      return res.status(400).json({
        message: "Missing or invalid field 'sprintId'. It must be an integer.",
      });
    }

    const isValidTrackerUids =
      Array.isArray(trackerUids) &&
      trackerUids.every((id) => typeof id === "string");
    const isValidProjectIds =
      Array.isArray(projectIds) &&
      projectIds.every((id) => Number.isInteger(id));
    const isValidRoleIds =
      Array.isArray(roleIds) && roleIds.every((id) => Number.isInteger(id));
    const isValidGroupIds =
      Array.isArray(groupIds) && groupIds.every((id) => Number.isInteger(id));

    if (!isValidTrackerUids) {
      return res.status(400).json({
        message: "Field 'trackerUids' must be an array of strings.",
      });
    }
    if (!isValidProjectIds) {
      return res.status(400).json({
        message: "Field 'projectIds' must be an array of integers.",
      });
    }
    if (!isValidRoleIds) {
      return res.status(400).json({
        message: "Field 'roleIds' must be an array of integers.",
      });
    }
    if (!isValidGroupIds) {
      return res.status(400).json({
        message: "Field 'groupIds' must be an array of integers.",
      });
    }

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/getworkplan",
      {
        sprintId,
        trackerUids,
        projectIds,
        roleIds,
        groupIds,
      },
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_workplan] upstream error:", payload);
    res.status(status).json(payload);
  }
});

app.post("/api/tl_workplan_capacity", async (req, res) => {
  try {
    const {
      dateStart,
      dateEnd,
      trackerUids = [],
      projectIds = [],
      roleIds = [],
      groupIds = [],
    } = req.body ?? {};

    if (typeof dateStart !== "string" || dateStart.length === 0) {
      return res.status(400).json({
        message: "Missing required field(s): dateStart, dateEnd",
      });
    }
    if (typeof dateEnd !== "string" || dateEnd.length === 0) {
      return res.status(400).json({
        message: "Missing required field(s): dateStart, dateEnd",
      });
    }

    const isValidTrackerUids =
      Array.isArray(trackerUids) &&
      trackerUids.every((id) => typeof id === "string");
    const isValidProjectIds =
      Array.isArray(projectIds) &&
      projectIds.every((id) => Number.isInteger(id));
    const isValidRoleIds =
      Array.isArray(roleIds) && roleIds.every((id) => Number.isInteger(id));
    const isValidGroupIds =
      Array.isArray(groupIds) && groupIds.every((id) => Number.isInteger(id));

    if (!isValidTrackerUids) {
      return res.status(400).json({
        message: "Field 'trackerUids' must be an array of strings.",
      });
    }
    if (!isValidProjectIds) {
      return res.status(400).json({
        message: "Field 'projectIds' must be an array of integers.",
      });
    }
    if (!isValidRoleIds) {
      return res.status(400).json({
        message: "Field 'roleIds' must be an array of integers.",
      });
    }
    if (!isValidGroupIds) {
      return res.status(400).json({
        message: "Field 'groupIds' must be an array of integers.",
      });
    }

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/getworkplancapacity",
      { dateStart, dateEnd, trackerUids, projectIds, roleIds, groupIds },
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[api/tl_workplan_capacity] upstream error:", payload);
    res.status(status).json(payload);
  }
});

const handleSetWorkPlan = async (req, res) => {
  try {
    const {
      sprintId,
      taskKey,
      trackerUid,
      action,
      workPlanId,
      checklistItemId,
      workName,
      deadline,
      estimateTimeDays,
      priority,
    } = req.body ?? {};

    if (!Number.isInteger(sprintId)) {
      return res.status(400).json({
        message: "Missing or invalid field 'sprintId'. It must be an integer.",
      });
    }
    if (typeof taskKey !== "string" || taskKey.length === 0) {
      return res.status(400).json({
        message: "Missing or invalid field 'taskKey'. It must be a string.",
      });
    }
    if (typeof trackerUid !== "string" || trackerUid.length === 0) {
      return res.status(400).json({
        message: "Missing or invalid field 'trackerUid'. It must be a string.",
      });
    }
    if (![0, 1, 2].includes(action)) {
      return res.status(400).json({
        message: "Missing or invalid field 'action'. It must be 0, 1, or 2.",
      });
    }
    if ((action === 1 || action === 2) && !Number.isInteger(workPlanId)) {
      return res.status(400).json({
        message:
          "Field 'workPlanId' is required and must be an integer for Edit or Delete actions.",
      });
    }

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/setworkplan",
      {
        sprintId,
        taskKey,
        trackerUid,
        action,
        workPlanId,
        checklistItemId,
        workName,
        deadline,
        estimateTimeDays,
        priority,
      },
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[setworkplan] upstream error:", payload);
    res.status(status).json(payload);
  }
};

app.post("/api/setworkplan", handleSetWorkPlan);

const handleTlWorklogUpdate = async (req, res) => {
  try {
    const {
      taskKey,
      duration,
      startDate,
      deadlineOk,
      needUpgradeEstimate,
      makeTaskFaster,
      comment,
      action,
      checklistItemId,
      trackerUid,
      worklogId,
    } = req.body ?? {};

    if (typeof taskKey !== "string" || taskKey.length === 0) {
      return res.status(400).json({
        message: "Missing or invalid field 'taskKey'. It must be a string.",
      });
    }
    if (typeof duration !== "number" || !Number.isFinite(duration)) {
      return res.status(400).json({
        message: "Missing or invalid field 'duration'. It must be a number.",
      });
    }
    if (typeof startDate !== "string" || startDate.length === 0) {
      return res.status(400).json({
        message: "Missing or invalid field 'startDate'. It must be a string.",
      });
    }
    if (typeof deadlineOk !== "boolean") {
      return res.status(400).json({
        message: "Missing or invalid field 'deadlineOk'. It must be a boolean.",
      });
    }
    if (typeof needUpgradeEstimate !== "boolean") {
      return res.status(400).json({
        message:
          "Missing or invalid field 'needUpgradeEstimate'. It must be a boolean.",
      });
    }
    if (typeof makeTaskFaster !== "boolean") {
      return res.status(400).json({
        message:
          "Missing or invalid field 'makeTaskFaster'. It must be a boolean.",
      });
    }
    if (typeof comment !== "string") {
      return res.status(400).json({
        message: "Missing or invalid field 'comment'. It must be a string.",
      });
    }
    if (![0, 1, 2].includes(action)) {
      return res.status(400).json({
        message: "Field 'action' must be 0 (Add), 1 (Edit), or 2 (Delete).",
      });
    }
    if (typeof trackerUid !== "string" || trackerUid.length === 0) {
      return res.status(400).json({
        message: "Missing or invalid field 'trackerUid'. It must be a string.",
      });
    }
    if (checklistItemId != null && typeof checklistItemId !== "string") {
      return res.status(400).json({
        message: "Field 'checklistItemId' must be a string when provided.",
      });
    }
    if ((action === 1 || action === 2) && !Number.isInteger(worklogId)) {
      return res.status(400).json({
        message:
          "Field 'worklogId' is required and must be an integer for Edit or Delete actions.",
      });
    }

    const resp = await axios.post(
      "http://of-srv-apps-001.pmtech.ru:18005/acceptor/yandextracker/tlworklogupdate",
      {
        taskKey,
        duration,
        startDate,
        deadlineOk,
        needUpgradeEstimate,
        makeTaskFaster,
        comment,
        action,
        checklistItemId,
        trackerUid,
        worklogId,
      },
      {
        timeout: 15000,
      },
    );

    res.json(resp.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const payload = {
      error: error.message,
      code: error.code,
      cause: error.cause,
      upstreamStatus: error.response?.status,
      upstreamData: error.response?.data,
    };
    console.error("[tlworklogupdate] upstream error:", payload);
    res.status(status).json(payload);
  }
};

app.post("/api/tlworklogupdate", handleTlWorklogUpdate);

app.listen(4000, () => console.log("Proxy server running on port 4000"));
