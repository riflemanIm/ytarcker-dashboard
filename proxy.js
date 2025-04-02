import express from "express";
import axios from "axios";
import cors from "cors";
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
  const startTimestamp = startDateObj.getTime();
  const endTimestamp = endDateObj.getTime();

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
      const from = subtractWeeks(startDate, 1);
      const to = `${getEndOfCurrentWeek()}T23:59`;

      // Формируем тело запроса
      let requestBody = {
        createdAt: {
          from,
          to,
        },
      };
      // Если логин передан, добавляем его в запрос
      if (login) {
        requestBody.createdBy = login;
      }
      console.log(requestBody);
      const url =
        "https://api.tracker.yandex.net/v2/worklog/_search?perPage=1000";
      const response = await axios.post(url, requestBody, headers(token));

      // Формируем список пользователей без повторов
      let users = response.data.map((it) => ({
        id: parseInt(it.updatedBy.id),
        name: it.updatedBy.display,
      }));
      users = [...new Map(users.map((item) => [item.id, item])).values()];

      // Фильтрация данных с использованием уже вычисленных timestamp'ов
      let data = [];
      if (!login && userId) {
        data = response.data.filter(
          (it) =>
            parseInt(it.updatedBy.id) === Number(userId) &&
            filterDataByDateRange(it.start, startTimestamp, endTimestamp)
        );
      } else {
        //     data = response.data;
        data = response.data.filter((it) => {
          // console.log(
          //   "startDate",
          //   startDate,
          //   "it.start",
          //   it.start,
          //   "endDate",
          //   endDate
          // );
          return filterDataByDateRange(it.start, startTimestamp, endTimestamp);
        });
      }

      // console.log(
      //   "from",
      //   from,
      //   "to",
      //   to,

      //   data,
      //   "userId",
      //   userId,
      //   "login",
      //   login
      // );
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
    console.log("========== start =========\n", start);
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

app.listen(4000, () => console.log("Proxy server running on port 4000"));
