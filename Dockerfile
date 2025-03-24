# Ступень 2: Минимальный образ
FROM node:20-alpine

# Создать обычного пользователя
RUN adduser -D -u 1100 pmt

# Установить минимальные зависимости
WORKDIR /app

# Скопировать зависимости и собранный код из первого этапа
RUN npm i express cors axios
COPY proxy.js /app


# Убедиться, что все файлы принадлежат пользователю appuser
RUN chown -R pmt:pmt /app

# Переключиться на обычного пользователя
USER pmt

# Команда для запуска приложения
CMD ["nodejs", "./proxy.js"]
#CMD ["yarn", "start_proxy"]  
# или CMD ["node", "dist/index.js"], если вы используете build-процесс
