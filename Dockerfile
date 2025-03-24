# Ступень 1: Сборка приложения
FROM node:20-alpine AS builder

# Установить Yarn
RUN apk add --no-cache yarn

# Создать директорию для приложения
WORKDIR /app

# Копировать package.json и yarn.lock
COPY package.json yarn.lock ./

# Установить зависимости
RUN yarn install --frozen-lockfile --production

# Копировать остальные файлы приложения
COPY . .

# Собрать приложение (если требуется)
RUN yarn build || true  # Если у вас есть команда build, выполните её

# Ступень 2: Минимальный образ
FROM node:20-alpine

# Создать обычного пользователя
RUN adduser -D -u 1100 pmt

# Установить минимальные зависимости
WORKDIR /app
RUN npm i express && npm i cors
# Скопировать зависимости и собранный код из первого этапа
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/proxy.js /app/proxy.js
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/vite.config.js /app/vite.config.js
COPY --from=builder /app/.env /app/.env

# Убедиться, что все файлы принадлежат пользователю appuser
RUN chown -R pmt:pmt /app

# Переключиться на обычного пользователя
USER pmt

# Команда для запуска приложения
CMD ["nodejs", "./proxy.js"]
#CMD ["yarn", "start_proxy"]  
# или CMD ["node", "dist/index.js"], если вы используете build-процесс
