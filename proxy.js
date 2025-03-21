import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/issues", async (req, res) => {
  try {
    let { token } = req.query;

    console.log("token, ", token);
    if (token) {
      const response = await axios.get(
        "https://api.tracker.yandex.net/v2/issues",
        {
          headers: {
            Authorization: `OAuth ${token}`,
            "X-Org-ID": "8063720",
            Host: "api.tracker.yandex.net",
          },
        }
      );
      res.json(response.data);
    } else {
      console.log("token not pass");
      res.status(400).json({ error: "token not pass" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(4000, () => console.log("Proxy server running on port 4000"));
