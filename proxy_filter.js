import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/issues", async (req, res) => {
  let { token, startDate, endDate, login } = req.query;
  console.log("token", token);
  console.log("startDate", startDate);
  console.log("endDate", endDate);

  try {
    if (token) {
      // ------------ users -------------
      console.log("login", login);
      const responseUsers = await axios.get(
        "https://api.tracker.yandex.net/v2/users",
        {
          headers: {
            Authorization: `OAuth ${token}`,
            "X-Org-ID": "8063720",
            Host: "api.tracker.yandex.net",
          },
        }
      );

      // ------------ issues filter issues -------------
      // const url = "https://api.tracker.yandex.net/v2/issues/_search";
      // const response = await axios.post(
      //   url,
      //   {
      //     filter: {
      //       queue: "APPS",
      //       assignee: "i.babkov",
      //     },
      //   },
      //   {
      //     headers: {
      //       Authorization: `OAuth ${token}`,
      //       "X-Org-ID": "8063720",
      //       Host: "api.tracker.yandex.net",
      //     },
      //   }
      // );

      // ------------ issues filter issues -------------
      const url = "https://api.tracker.yandex.net/v2/worklog/_search";
      const response = await axios.post(
        url,
        {
          createdBy: login !== "undefined" ? login : undefined,
          //createdBy: "i.babkov",
          // createdAt: {
          //   from: startDate,
          //   to: endDate,
          // },
        },
        {
          headers: {
            Authorization: `OAuth ${token}`,
            "X-Org-ID": "8063720",
            Host: "api.tracker.yandex.net",
          },
        }
      );

      //console.log("response.data", response.data);
      res.json({ data: response.data, users: responseUsers.data });
    } else {
      res.status(400).json({ error: "token not pass " });
    }
  } catch (error) {
    console.log(error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(4000, () => console.log("Proxy server running on port 4000"));
