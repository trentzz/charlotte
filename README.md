# Charlotte

A self-hosted personal website platform. Each registered user gets a public page at `/u/{username}/` with a blog, about page, photo gallery, and recipe book. Users choose which features to enable. An admin panel handles user approval, content moderation, and site settings.

---

## Features

- **Blog** — write posts with tags, publish or keep as drafts.
- **About page** — freeform text page for your bio or personal intro.
- **Photo gallery** — organise photos into albums; set cover photos; all uploads are MIME-validated.
- **Recipe book** — write recipes with ingredients and steps; log timestamped attempts as a cooking journal.
- **Per-user public pages** — each feature can be enabled or disabled independently.
- **Admin panel** — approve/suspend users, delete content, configure site name and registration settings, monitor disk usage.
- **Secure auth** — bcrypt passwords (cost 12), 30-day session cookies, CSRF protection on all forms, per-IP rate limiting on auth routes.

---

## Tech stack

- **Go 1.22** — standard library `net/http` and `html/template`; no framework.
- **SQLite** — via `modernc.org/sqlite` (pure Go, no CGO required).
- **Single CSS file** — pastel palette, CSS custom properties, no frameworks.
- **Docker + Kubernetes** — single-replica deployment with a PVC for the database and uploads.

---

## Running locally

### Without Docker

```bash
# Build
go build -o /tmp/charlotte ./cmd/charlotte

# Create data directory
mkdir -p /tmp/data

# Run
DATA_DIR=/tmp/data BASE_DIR=. PORT=8080 /tmp/charlotte
```

Open `http://localhost:8080`. The first user to register becomes admin automatically.

### With Docker

```bash
# Build the image
docker build -t charlotte .

# Run with a local data volume
docker run --rm \
  -p 9271:9271 \
  -v "$(pwd)/data:/data" \
  charlotte
```

The container reads `DATA_DIR=/data` and `BASE_DIR=/` by default (set in the Dockerfile). All persistent state lives under the mounted `/data` volume: the SQLite database and uploaded photos.

To recover from a backup, stop the container and replace the `data/` directory before restarting.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the HTTP server listens on. |
| `DATA_DIR` | `/data` | Root for the SQLite DB and uploaded files. |
| `BASE_DIR` | `.` | Root for templates and static assets. |

---

## URL structure

| Path | Access | Description |
|---|---|---|
| `/` | Public | Landing page listing active users. |
| `/register`, `/login` | Public | Auth (rate-limited). |
| `/u/{username}/` | Public | User home page. |
| `/u/{username}/blog/` | Public | Blog index. |
| `/u/{username}/blog/{slug}` | Public | Individual blog post. |
| `/u/{username}/about` | Public | About page. |
| `/u/{username}/gallery/` | Public | Photo gallery. |
| `/u/{username}/gallery/{album}` | Public | Album view. |
| `/u/{username}/recipes/` | Public | Recipe index. |
| `/u/{username}/recipes/{slug}` | Public | Recipe with attempt journal. |
| `/dashboard/` | Auth | Dashboard home. |
| `/dashboard/profile` | Auth | Edit profile, avatar, and links. |
| `/dashboard/blog/` | Auth | Manage posts. |
| `/dashboard/about` | Auth | Edit about page. |
| `/dashboard/gallery/` | Auth | Manage albums. |
| `/dashboard/gallery/album/{id}` | Auth | Upload and manage photos in an album. |
| `/dashboard/recipes/` | Auth | Manage recipes. |
| `/admin/` | Admin | Admin panel. |
| `/healthz` | Public | Health check — returns `200 ok`. |
| `/uploads/{userID}/{filename}` | Public | Serve uploaded photos. |

---

## Kubernetes deployment

The `k8s/` directory contains ready-to-apply manifests:

```bash
kubectl create namespace charlotte
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

The deployment uses `replicas: 1` — SQLite requires a single writer. The PVC is 20 Gi `ReadWriteOnce`; adjust the storage class in `pvc.yaml` to match your cluster.

To access the service locally:

```bash
kubectl port-forward -n charlotte svc/charlotte 8080:80
```

The app speaks plain HTTP on port 8080. Put an nginx or Traefik ingress in front for TLS termination.

---

## Data layout

```
/data/
├── db/charlotte.db          # SQLite database
└── uploads/
    └── {userID}/            # One directory per user
        └── {filename}       # Validated images only (JPEG, PNG, WebP, GIF; max 10 MB)
```

To back up: copy the entire `/data` directory. To restore: replace `/data` and restart.

---

## Admin bootstrap

The first user to register is automatically given admin status and set to active. All subsequent registrations are set to `pending` and require admin approval (unless you disable that in site settings).

If you need to promote an existing user to admin after the fact, set the `ADMIN_BOOTSTRAP_EMAIL` environment variable to their email address before starting the server.
