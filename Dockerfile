# syntax=docker/dockerfile:1

# Stage 1: Build the client
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci || npm install

COPY client/ ./
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY server/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY server/ ./
COPY --from=client-builder /app/client/dist ./public

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

CMD ["node", "index.js"]
