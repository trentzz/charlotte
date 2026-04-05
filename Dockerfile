# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline
COPY frontend/ .
RUN npm run build

# ── Stage 2: Build Go binary ───────────────────────────────────────────────────
FROM golang:1.24 AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/charlotte ./cmd/charlotte

# ── Stage 3: Runtime ───────────────────────────────────────────────────────────
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=go-builder /out/charlotte /charlotte
COPY --from=frontend-builder /app/frontend/dist /frontend/dist
VOLUME ["/data"]
ENV PORT=9271 DATA_DIR=/data BASE_DIR=/
EXPOSE 9271
ENTRYPOINT ["/charlotte"]
