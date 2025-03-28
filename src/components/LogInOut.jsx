import { Button, Typography } from "@mui/material";
import { useEffect } from "react";
import axios from "axios";

const CLIENT_ID = "bbdf8a5464ba4d7f8a29e947a1a3d913";
const REDIRECT_URI = import.meta.env.VITE_APP_REDIRECT_URI;
const AUTH_URL = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;

const handleLogin = () => {
  window.location.href = AUTH_URL;
};

const handleLogout = () => {
  localStorage.removeItem("yandex_token");
  localStorage.removeItem("yandex_login");
  window.location.href = "";
};

const LogInOut = ({ token, setToken }) => {
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const accessToken = params.get("access_token");

      if (accessToken) {
        setToken(accessToken);
        localStorage.setItem("yandex_token", accessToken);

        // Получаем логин пользователя
        const fetchLogin = async () => {
          try {
            const response = await axios.get(
              "https://login.yandex.ru/info?format=json",
              {
                headers: {
                  Authorization: `OAuth ${accessToken}`,
                },
              }
            );

            const login = response.data.login;
            if (login) {
              localStorage.setItem("yandex_login", login);
              console.log("Yandex login:", login);
            }
          } catch (error) {
            console.error(
              "Ошибка при получении информации о пользователе:",
              error
            );
          }
        };

        fetchLogin();
      }
    }
  }, [setToken]);

  return token ? (
    <Typography variant="body1">
      <Button onClick={handleLogout}>Выйти</Button>
    </Typography>
  ) : (
    <Button onClick={handleLogin}>Войти</Button>
  );
};

export default LogInOut;
