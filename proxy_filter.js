import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/issues", async (req, res) => {
  let { token, startDate, endDate, login, typeData } = req.query;
  console.log("token", token);
  console.log("startDate", startDate);
  console.log("endDate", endDate);

  try {
    if (token) {
      // ------------ users -------------
      // console.log("login", login);
      // let responseUsers = [];
      // if (typeData === "all" || typeData === "users") {
      //   responseUsers = await axios.get(
      //     "https://api.tracker.yandex.net/v2/users?perPage=1000",
      //     {
      //       headers: {
      //         Authorization: `OAuth ${token}`,
      //         "X-Org-ID": "8063720",
      //         Host: "api.tracker.yandex.net",
      //       },
      //     }
      //   );
      // }

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
      let response = [];
      if (typeData === "all" || typeData === "data") {
        startDate = "2025-02-11";
        endDate = "2025-03-21";
        const createdBy = login !== "undefined" ? login : undefined;
        //const createdBy = "i.babkov";
        const url =
          "https://api.tracker.yandex.net/v2/worklog/_search?perPage=1000";
        response = await axios.post(
          url,
          {
            createdBy,
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
      }
      // const uniqueUsersIds = [
      //   ...new Set(response.data.map((item) => parseInt(item.updatedBy.id))),
      // ];

      const userFromData = response.data.map((it) => ({
        id: parseInt(it.updatedBy.id),
        name: it.updatedBy.display,
      }));
      console.log("userFromData", userFromData);

      let uniqueUsers = [];

      userFromData.forEach((it) => {
        if (!uniqueUsers.find((itt) => it.id == itt.id)) {
          uniqueUsers.push(it);
        }
      });

      console.log("uniqueUsers", uniqueUsers);
      //const users=
      res.json({ data: response.data, users: uniqueUsers });
    } else {
      res.status(400).json({ error: "token not pass " });
    }
  } catch (error) {
    console.log(error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(4000, () => console.log("Proxy server running on port 4000"));
