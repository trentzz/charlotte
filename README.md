# Charlotte

A self-hosted personal website platform. Each user gets a public page at `/u/{username}/` with a blog, photo gallery, recipe book, project showcase, and about page. Multiple users share one instance. The platform is intentionally non-social — no feeds, no follows, no public user directory.

---

## Features

- **Blog** — Markdown posts with tags, drafts, and per-post visibility.
- **Gallery** — Photo albums (JPEG, PNG, WebP, GIF, up to 10 MB each). Editorial grid layout, lightbox viewer.
- **Recipes** — Ingredient lists, step-by-step method, and a variations journal for tracking attempts.
- **Projects** — Portfolio cards with title, description, and external link.
- **About page** — Single Markdown document as a public about page.
- **Per-user theming** — Accent colour, background colour, display font, body font, UI font, and font sizes. Separate light and dark mode palettes. All configurable from the dashboard.
- **Dark/light mode toggle** — Visitors can switch mode; preference stored in `localStorage`.
- **Dashboard** — Settings-style page (same nav as public pages) for managing all content and appearance.
- **Admin panel** — User approval, suspension, deletion; content moderation; site settings.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22, standard library `net/http`, SQLite (WAL mode) |
| Frontend | React 18, Material UI v5, Vite, React Router v6, Axios |
| Auth | bcrypt passwords, 32-byte session tokens, HttpOnly cookies |
| Storage | Files on disk under `/data/uploads/{userID}/` |
| Deployment | Docker (multi-stage build), single binary, no external services |

---

## Running locally

### With Docker (recommended)

```bash
docker compose up -d
```

The app starts on port 9271. The first registered account becomes admin.

### Without Docker

```bash
# Build the frontend
cd frontend && npm install && npm run build && cd ..

# Run the Go server
PORT=9271 DATA_DIR=./data BASE_DIR=. go run ./cmd/charlotte
```

---

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9271` | HTTP port |
| `DATA_DIR` | `/data` | Directory for the SQLite database and uploaded files |
| `BASE_DIR` | `.` | Directory containing the `frontend/dist/` folder |

---

## Development

```bash
# Start the Go API server
PORT=9271 DATA_DIR=./data BASE_DIR=. go run ./cmd/charlotte

# In a separate terminal, start the Vite dev server (proxies /api to port 9271)
cd frontend && npm run dev
```

The Vite dev server runs on port 5173 and proxies all `/api` and `/uploads` requests to the Go server.

---

## Deployment

Charlotte is designed for single-replica deployment (SQLite single-writer).

- **Docker**: `docker compose up -d` — uses the provided `docker-compose.yml`.
- **Kubernetes**: single replica, ClusterIP service, ReadWriteOnce PVC for `/data`. A sample manifest is in `k8s/`.
- **Reverse proxy**: put nginx or Traefik in front for TLS. The app speaks plain HTTP.

---

## Database migrations

Migrations live in `internal/db/migrations.go` as an ordered slice of SQL statements. Each migration runs exactly once. To add a new migration, append a new entry — never modify existing ones.
