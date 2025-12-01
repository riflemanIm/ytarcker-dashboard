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
      headers(token)
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
              headers(token)
            )
            .catch((err) => {
              console.error(`Ошибка удаления worklog ${id}:`, err.message);
              throw err;
            })
        )
      );
    }

    res.json(true);
  } catch (error) {
    console.error("[Ошибка в методе /api/add_time]:", error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});
// Получить все задачи пользователя, отсортированные по последнему обновлению
const trackerSearchRequest = async (token, body) => {
  const url = "https://api.tracker.yandex.net/v3/issues/_search?perPage=10000";
  const response = await axios.post(url, body, headers(token));
  const payload = response.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.issues)) {
    return payload.issues;
  }

  return [];
};

const searchTracker = (token, filter) =>
  trackerSearchRequest(token, { filter, order: "-updated" });

const searchTrackerByText = (token, text, queue) => {
  const queryParts = [];
  if (queue) {
    queryParts.push(`queue:${queue}`);
  }
  queryParts.push(text);
  const body = { query: queryParts.join(" ").trim(), order: "-updated" };
  return trackerSearchRequest(token, body);
};

const fetchIssueComments = async (token, issueId) => {
  if (!issueId) return "";
  try {
    const { data } = await axios.get(
      `https://api.tracker.yandex.net/v2/issues/${issueId}/comments`,
      headers(token)
    );
    if (!Array.isArray(data)) return "";
    return data
      .map((comment) => comment.text ?? comment.textHtml ?? "")
      .join("\n");
  } catch (error) {
    console.error(
      "[fetchIssueComments] error:",
      error.response?.status,
      error.message
    );
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
      headers(token)
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
  const { token, search_str: searchStrRaw, queue: queueRaw } = req.query;

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

  try {
    const issues = await searchTrackerByText(token, searchStr, queue);

    const normalized = await Promise.all(
      issues.map(async (issue) => ({
        key: issue.key,
        summary: issue.summary,
        status: issue.status?.display,
        queue: issue.queue?.key,
        assignee: issue.assignee?.display,
        description: issue.description ?? issue?.descriptionHtml ?? "",
        commentsText: await fetchIssueComments(token, issue.id),
      }))
    );

    res.json({ issues: normalized });
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
      }
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

app.listen(4000, () => console.log("Proxy server running on port 4000"));
