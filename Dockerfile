# syntax=docker/dockerfile:1
# Image production cho Cloud Run (F19.2, ADR-016) — hướng dẫn: docs/guides/deploy-cloud-run.md
#   docker build -t meridian .
#   docker run -p 8080:8080 -e DATABASE_URL=... meridian
# Không chạy migrate trong container: CI chạy `prisma migrate deploy` trước khi deploy (F19.7).
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# prisma7.config.ts đọc DATABASE_URL, nhưng generate và build không kết nối DB → URL giả là đủ.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
# .next/standalone đã có .next/static (script postbuild trong package.json copy vào).
COPY --from=build --chown=node:node /app/.next/standalone ./
USER node
EXPOSE 8080
CMD ["node", "server.js"]
