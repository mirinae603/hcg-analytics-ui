FROM node:20-slim AS build
WORKDIR /app
COPY package.json .npmrc ./
# package-lock.json is generated on macOS and only carries resolved metadata
# for darwin-arm64's native optional deps (tailwind oxide, lightningcss, ...).
# `npm install` treats an existing lock as authoritative and won't re-resolve
# those for linux, so drop it and let npm resolve fresh for this platform.
RUN npm install
COPY . .
ARG NEXT_PUBLIC_DASHBOARD_API
ENV NEXT_PUBLIC_DASHBOARD_API=${NEXT_PUBLIC_DASHBOARD_API}
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

# Cloud hosts inject $PORT; next start binds to it (defaults to 3000 locally).
EXPOSE 3000
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
