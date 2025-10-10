import express from "express";
import axios from "axios";
import cors from "cors";
import https from "https";
// Функция для отнимания недель от даты
function subtractWeeks(dateStr, weeks) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - weeks * 7);
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * Фильтрует данные по диапазону дат.
 * @param {string} start - входящая дата
 * @param {number} startTimestamp - Начало диапазона (timestamp)
 * @param {number} endTimestamp - Конец диапазона (timestamp)
 * @returns {boolean} - true если входящая дата попадает в диапазон
 */
function filterDataByDateRange(start, startTimestamp, endTimestamp) {
  const itemTimestamp = new Date(start).getTime();
  return itemTimestamp >= startTimestamp && itemTimestamp <= endTimestamp;
}
/**
 * Возвращает дату конца текущей недели (воскресенье) в формате YYYY-MM-DD.
 */
function getEndOfCurrentWeek() {
  const now = new Date();
  let day = now.getDay(); // 0 (воскресенье) - 6 (суббота)
  // Если сегодня не воскресенье, вычисляем оставшиеся дни до воскресенья.
  const diffToSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diffToSunday);
  const year = sunday.getFullYear();
  const month = ("0" + (sunday.getMonth() + 1)).slice(-2);
  const date = ("0" + sunday.getDate()).slice(-2);
  return `${year}-${month}-${date}`;
}

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
  console.log("token", token);
  endDate = `${endDate}T23:59`;
  // Преобразование startDate и endDate из строки в дату
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  // const startTimestamp = startDateObj.getTime();
  // const endTimestamp = endDateObj.getTime();

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
      const from = startDate;
      //const to = `${endDate}T23:59`;
      const to = endDate;
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
      const data = response.data;

      // Формируем список пользователей без повторов
      let users = data.map((it) => ({
        id: `${it.updatedBy.id}`,
        name: it.updatedBy.display,
      }));
      users = [...new Map(users.map((item) => [item.id, item])).values()];

      console.log("data.length ", data.length);
      res.json({ data, users });
    } else {
      res.status(400).json({ error: "token not pass" });
    }
  } catch (error) {
    console.log(error.message);
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
    console.log("========== add_time start =========\n", start);
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
const searchTracker = async (token, filter) => {
  const url = "https://api.tracker.yandex.net/v3/issues/_search?perPage=10000";
  const response = await axios.post(
    url,
    { filter, order: "-updated" },
    headers(token)
  );
  //console.log("response", response);
  return response.data;
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
