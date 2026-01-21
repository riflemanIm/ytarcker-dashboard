import React, { useEffect } from "react";
import { Box, Button, Typography } from "@mui/material";
import axios from "axios";

import { useAppContext } from "@/context/AppContext";

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

const LogInOut: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { token } = state.auth;
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const tokenFromHash = params.get("access_token");
      if (tokenFromHash) {
        dispatch({ type: "setAuth", payload: { token: tokenFromHash } });
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

              dispatch({
                type: "setAuth",
                payload: (prev) => ({
                  ...prev,
                  login: login.includes("@") ? login.split("@")[0] : login,
                }),
              });
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
    <Box textAlign="right">
      <Button onClick={() => handleLogout()}>Выйти </Button>

      <Typography variant="subtitle1" color="text.secondary">
        {localStorage.getItem("yandex_login")}
      </Typography>
    </Box>
  ) : (
    <Button onClick={handleLogin}>Войти</Button>
  );
};

export default LogInOut;
