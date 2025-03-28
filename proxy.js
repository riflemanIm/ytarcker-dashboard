import express from "express";
import axios from "axios";
import cors from "cors";
function isArray(obj) {
  return obj instanceof Array;
}
const isEmpty = (value) => {
  return (
    value == null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
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
  console.log("token", token);

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

      // Форматирование даты
      endDate = `${endDate}T23:59`;

      // Формируем тело запроса
      let requestBody = {
        createdAt: {
          from: startDate,
          to: endDate,
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

      // Если login не передан, но указан userId, фильтруем данные по userId
      let data = [];
      if (!login && userId) {
        data = response.data.filter(
          (it) => parseInt(it.updatedBy.id) === Number(userId)
        );
      } else {
        data = response.data;
      }

      console.log(
        response.data[0],
        "startDate",
        startDate,
        "endDate",
        endDate,
        "userId",
        userId,
        "login",
        login
      );
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
