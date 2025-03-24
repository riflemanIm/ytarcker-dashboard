import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/issues", async (req, res) => {
  let { token, startDate, endDate, userId } = req.query;
  console.log("token", token);

  try {
    if (token) {
      // ------------ issues filter issues -------------
      let response = [];

      userId = userId !== "undefined" && userId !== "null" ? userId : null;
      // startDate = "2025-02-11";
      // endDate = "2025-03-21";
      endDate = `${endDate}T23:59`;
      const url =
        "https://api.tracker.yandex.net/v2/worklog/_search?perPage=1000";
      response = await axios.post(
        url,
        {
          createdAt: {
            from: startDate,
            to: endDate,
          },
        },
        {
          headers: {
            Authorization: `OAuth ${token}`,
            "X-Org-ID": "8063720",
            Host: "api.tracker.yandex.net",
          },
        }
      );

      let users = response.data.map((it) => ({
        id: parseInt(it.updatedBy.id),
        name: it.updatedBy.display,
      }));
      users = [...new Map(users.map((item) => [item.id, item])).values()];

      const data = response.data.filter(
        (it) => it.createdBy.id === userId || userId == null
      );
      console.log(users, "startDate", startDate, "endDate", endDate, userId);
      res.json({ data, users });
    } else {
      res.status(400).json({ error: "token not pass " });
    }
  } catch (error) {
    console.log(error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(4000, () => console.log("Proxy server running on port 4000"));
