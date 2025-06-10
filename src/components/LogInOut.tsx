import React, { useEffect } from "react";
import { Button, Typography } from "@mui/material";
import axios from "axios";

import { AuthState } from "../types/global";

interface LogInOutProps {
  token: string | null;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

const CLIENT_ID = "bbdf8a5464ba4d7f8a29e947a1a3d913";
const REDIRECT_URI = import.meta.env.VITE_APP_REDIRECT_URI as string;
const AUTH_URL = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;

const handleLogin = (): void => {
  window.location.href = AUTH_URL;
};

export const handleLogout = (): void => {
  localStorage.removeItem("yandex_token");
  localStorage.removeItem("yandex_login");

  window.location.href = "";
};

const LogInOut: React.FC<LogInOutProps> = ({ token, setAuth }) => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const tokenFromHash = params.get("access_token");
      if (tokenFromHash) {
        setAuth({ token: tokenFromHash });
        localStorage.setItem("yandex_token", tokenFromHash);

        // Получаем логин пользователя
        const fetchLogin = async () => {
          try {
            const response = await axios.get(
              "https://login.yandex.ru/info?format=json",
              {
                headers: {
                  Authorization: `OAuth ${tokenFromHash}`,
                },
              }
            );

            const login: string | null = response.data.login;

            if (login) {
              localStorage.setItem("yandex_login", login);

              console.log("Yandex login:", login);

              setAuth((prev) => ({
                ...prev,
                login: login.includes("@") ? login.split("@")[0] : login,
              }));
              window.location.href = "/";

              // setAuth((prev) => ({
              //   ...prev,
              //   login: "a.minyaev",
              // }));
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
  }, []);

  return token ? (
    <>
      <Button onClick={() => handleLogout()}>Выйти </Button>

      <Typography variant="subtitle1" color="text.secondary">
        {localStorage.getItem("yandex_login")}
      </Typography>
    </>
  ) : (
    <Button onClick={handleLogin}>Войти</Button>
  );
};

export default LogInOut;
