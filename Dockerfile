# syntax=docker/dockerfile:1

# Stage 1: Build the client
FROM node:20-alpine AS client-builder
WORKDIR /app/client

ENV NODE_ENV=development

COPY client/package*.json ./
RUN npm ci --include=dev

COPY client/ ./
RUN npm run build

# Stage 2: Build the server
FROM node:20-alpine AS server-builder
WORKDIR /app/server

ENV NODE_ENV=development

COPY server/package*.json ./
RUN npm ci --include=dev

COPY server/ ./
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl wget

ENV NODE_ENV=production
ENV PORT=4000

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src/db/migrations.sql ./dist/db/migrations.sql
COPY --from=server-builder /app/server/src/db/migrations.sql ./src/db/migrations.sql
COPY --from=client-builder /app/client/dist ./public

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -fsS http://127.0.0.1:4000/healthz || exit 1

CMD ["node", "dist/index.js"]
