# Ступень 2: Минимальный образ
FROM node:20-alpine

# Создать обычного пользователя
RUN adduser -D -u 1100 pmt

# Установить минимальные зависимости
WORKDIR /app
COPY /app/node_modules /app/node_modules
COPY /app/proxy.js /app/proxy.js

RUN yarn add express cors axios


# Убедиться, что все файлы принадлежат пользователю appuser
RUN chown -R pmt:pmt /app

# Переключиться на обычного пользователя
USER pmt

# Команда для запуска приложения
CMD ["nodejs", "./proxy.js"]

#CMD ["yarn", "start_proxy"]  
# или CMD ["node", "dist/index.js"], если вы используете build-процесс
