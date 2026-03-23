# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/charlotte ./cmd/charlotte

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12

COPY --from=builder /out/charlotte  /charlotte
COPY templates/                     /templates/
COPY static/                        /static/

ENV PORT=9271
ENV DATA_DIR=/data
ENV BASE_DIR=/

EXPOSE 9271

ENTRYPOINT ["/charlotte"]
