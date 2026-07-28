FROM node:20-slim AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm install \
  && ls node_modules/@tailwindcss/ \
  && (node -e "require('@tailwindcss/oxide')" \
      || (echo '--- oxide native binding missing, forcing explicit install ---' \
          && npm install @tailwindcss/oxide-linux-x64-gnu --no-save \
          && node -e "require('@tailwindcss/oxide')"))
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
