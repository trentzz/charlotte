// Charlotte is a personal website platform with blogging, photo galleries,
// recipe management, and per-user public pages. This binary serves a JSON
// REST API consumed by a React SPA.
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	appdb "github.com/trentzz/charlotte/internal/db"
	"github.com/trentzz/charlotte/internal/api"
	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/storage"
)

type config struct {
	Port    string
	DataDir string
	BaseDir string
}

func loadConfig() config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "/data"
	}
	baseDir := os.Getenv("BASE_DIR")
	if baseDir == "" {
		baseDir = "."
	}
	return config{Port: port, DataDir: dataDir, BaseDir: baseDir}
}

// securityHeaders sets basic security headers on every response.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

// requestLogger logs each request's method, path, and response status.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)
		if r.URL.Path != "/healthz" {
			log.Printf("%s %s %d", r.Method, r.URL.Path, rec.status)
		}
	})
}

func main() {
	cfg := loadConfig()

	// Open / migrate the database.
	db, err := appdb.Open(cfg.DataDir)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	// Compress any existing photos that pre-date the compression feature.
	rows, err := db.Query(
		`SELECT id, user_id, filename FROM photos WHERE compressed_filename = '' AND mime_type != 'image/gif'`,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, userID int64
			var filename string
			if err := rows.Scan(&id, &userID, &filename); err != nil {
				continue
			}
			cf, err := storage.CompressPhoto(cfg.DataDir, userID, filename)
			if err != nil {
				log.Printf("compress photo %d: %v", id, err)
				continue
			}
			_, _ = db.Exec(`UPDATE photos SET compressed_filename = ? WHERE id = ?`, cf, id)
			log.Printf("compressed photo %d -> %s", id, cf)
		}
	}

	app := &api.App{
		DB:      db,
		DataDir: cfg.DataDir,
	}

	// Build middleware helpers.
	public := middleware.PublicChain(db)
	authed := middleware.AuthChain(db)
	admin := middleware.AdminChain(db)
	csrf := middleware.CSRFMiddleware

	// Rate limiters for auth endpoints.
	authLimiter := middleware.NewRateLimiter(10, 0.5) // 10 burst, 1 per 2 seconds

	// Upload routes need a larger body limit. We apply limits at the server
	// level based on path so that nesting never causes the tighter limit to win.

	mux := http.NewServeMux()

	// ── Static SPA assets ────────────────────────────────────────────────────────
	mux.Handle("GET /assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(cfg.BaseDir+"/frontend/dist/assets"))))
	mux.HandleFunc("GET /favicon.svg", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, cfg.BaseDir+"/frontend/dist/favicon.svg")
	})

	// ── Uploads ──────────────────────────────────────────────────────────────────
	mux.HandleFunc("GET /uploads/{userID}/{filename}", app.ServeUpload)

	// ── Health check ─────────────────────────────────────────────────────────────
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprint(w, "ok")
	})

	// ── Auth API ─────────────────────────────────────────────────────────────────
	mux.Handle("GET /api/v1/auth/csrf", public(csrf(http.HandlerFunc(app.CSRFToken))))
	mux.Handle("GET /api/v1/auth/me", public(http.HandlerFunc(app.Me)))
	mux.Handle("POST /api/v1/auth/register", public(csrf(authLimiter.Middleware(http.HandlerFunc(app.Register)))))
	mux.Handle("POST /api/v1/auth/login", public(csrf(authLimiter.Middleware(http.HandlerFunc(app.Login)))))
	mux.Handle("POST /api/v1/auth/logout", authed(csrf(http.HandlerFunc(app.Logout))))

	// ── Public API ───────────────────────────────────────────────────────────────
	mux.Handle("GET /api/v1/settings", http.HandlerFunc(app.Settings))
	mux.Handle("GET /api/v1/users", http.HandlerFunc(app.UserList))
	mux.Handle("GET /api/v1/verify-email", public(http.HandlerFunc(app.VerifyEmail)))

	// Per-user public pages.
	mux.Handle("GET /api/v1/u/{username}", public(http.HandlerFunc(app.UserProfile)))
	mux.Handle("GET /api/v1/u/{username}/blog", public(http.HandlerFunc(app.BlogIndex)))
	mux.Handle("GET /api/v1/u/{username}/blog/{slug}", public(http.HandlerFunc(app.BlogPost)))
	mux.Handle("GET /api/v1/u/{username}/about", http.HandlerFunc(app.AboutPage))
	mux.Handle("GET /api/v1/u/{username}/gallery", public(http.HandlerFunc(app.GalleryHome)))
	mux.Handle("GET /api/v1/u/{username}/gallery/{album}", public(http.HandlerFunc(app.GalleryAlbum)))
	mux.Handle("GET /api/v1/u/{username}/recipes", public(http.HandlerFunc(app.RecipeIndex)))
	mux.Handle("GET /api/v1/u/{username}/recipes/{slug}", public(http.HandlerFunc(app.RecipePost)))
	mux.Handle("GET /api/v1/u/{username}/projects", public(http.HandlerFunc(app.ProjectsPage)))
	mux.Handle("GET /api/v1/u/{username}/projects/{slug}", public(http.HandlerFunc(app.ProjectDetail)))
	mux.HandleFunc("GET /api/v1/u/{username}/search", app.PublicSearch)
	mux.HandleFunc("GET /api/v1/u/{username}/pages/{slug}", app.CustomPageShow)

	// ── Dashboard API ────────────────────────────────────────────────────────────
	mux.Handle("GET /api/v1/dashboard/profile", authed(http.HandlerFunc(app.DashProfile)))
	mux.Handle("PUT /api/v1/dashboard/profile", authed(csrf(http.HandlerFunc(app.DashProfileUpdate))))
	mux.Handle("POST /api/v1/dashboard/avatar", authed(csrf(http.HandlerFunc(app.DashAvatarUpload))))
	mux.Handle("GET /api/v1/dashboard/features", authed(http.HandlerFunc(app.DashFeatures)))
	mux.Handle("PUT /api/v1/dashboard/features", authed(csrf(http.HandlerFunc(app.DashFeaturesSave))))
	mux.Handle("GET /api/v1/dashboard/appearance", authed(http.HandlerFunc(app.DashAppearance)))
	mux.Handle("PUT /api/v1/dashboard/appearance", authed(csrf(http.HandlerFunc(app.DashAppearanceSave))))
	mux.Handle("POST /api/v1/dashboard/send-verification", authed(csrf(http.HandlerFunc(app.DashSendVerification))))

	// Dashboard — blog.
	mux.Handle("GET /api/v1/dashboard/blog", authed(http.HandlerFunc(app.DashBlogList)))
	mux.Handle("POST /api/v1/dashboard/blog", authed(csrf(http.HandlerFunc(app.DashBlogCreate))))
	mux.Handle("POST /api/v1/dashboard/blog/image", authed(csrf(http.HandlerFunc(app.DashBlogImageUpload))))
	mux.Handle("GET /api/v1/dashboard/blog/{id}", authed(http.HandlerFunc(app.DashBlogGet)))
	mux.Handle("PUT /api/v1/dashboard/blog/{id}", authed(csrf(http.HandlerFunc(app.DashBlogUpdate))))
	mux.Handle("PATCH /api/v1/dashboard/blog/{id}/toggle", authed(csrf(http.HandlerFunc(app.DashBlogToggle))))
	mux.Handle("PATCH /api/v1/dashboard/blog/{id}/theme", authed(csrf(http.HandlerFunc(app.DashBlogTheme))))
	mux.Handle("DELETE /api/v1/dashboard/blog/{id}", authed(csrf(http.HandlerFunc(app.DashBlogDelete))))

	// Dashboard — about.
	mux.Handle("GET /api/v1/dashboard/about", authed(http.HandlerFunc(app.DashAbout)))
	mux.Handle("PUT /api/v1/dashboard/about", authed(csrf(http.HandlerFunc(app.DashAboutSave))))

	// Dashboard — gallery.
	mux.Handle("GET /api/v1/dashboard/gallery", authed(http.HandlerFunc(app.DashGalleryList)))
	mux.Handle("POST /api/v1/dashboard/gallery/albums", authed(csrf(http.HandlerFunc(app.DashAlbumCreate))))
	mux.Handle("POST /api/v1/dashboard/gallery/photos", authed(csrf(http.HandlerFunc(app.DashPhotoUpload))))
	mux.Handle("GET /api/v1/dashboard/gallery/albums/{id}", authed(http.HandlerFunc(app.DashAlbumGet)))
	mux.Handle("PUT /api/v1/dashboard/gallery/albums/{id}", authed(csrf(http.HandlerFunc(app.DashAlbumUpdate))))
	mux.Handle("PATCH /api/v1/dashboard/gallery/albums/{id}/toggle", authed(csrf(http.HandlerFunc(app.DashAlbumToggle))))
	mux.Handle("PATCH /api/v1/dashboard/gallery/albums/{id}/default", authed(csrf(http.HandlerFunc(app.DashAlbumSetDefault))))
	mux.Handle("PATCH /api/v1/dashboard/gallery/albums/{id}/default-child", authed(csrf(http.HandlerFunc(app.DashAlbumSetDefaultChild))))
	mux.Handle("PATCH /api/v1/dashboard/gallery/albums/{id}/theme", authed(csrf(http.HandlerFunc(app.DashAlbumTheme))))
	mux.Handle("DELETE /api/v1/dashboard/gallery/albums/{id}", authed(csrf(http.HandlerFunc(app.DashAlbumDelete))))
	mux.Handle("PUT /api/v1/dashboard/gallery/albums/{id}/cover", authed(csrf(http.HandlerFunc(app.DashAlbumSetCover))))
	mux.Handle("POST /api/v1/dashboard/gallery/albums/{id}/photos", authed(csrf(http.HandlerFunc(app.DashAlbumAddPhoto))))
	mux.Handle("DELETE /api/v1/dashboard/gallery/albums/{id}/photos/{photoID}", authed(csrf(http.HandlerFunc(app.DashAlbumRemovePhoto))))
	mux.Handle("GET /api/v1/dashboard/gallery/photos", authed(http.HandlerFunc(app.DashUserPhotos)))
	mux.Handle("DELETE /api/v1/dashboard/gallery/photos/{id}", authed(csrf(http.HandlerFunc(app.DashPhotoDelete))))
	mux.Handle("PATCH /api/v1/dashboard/gallery/photos/{id}/rotate", authed(csrf(http.HandlerFunc(app.DashPhotoRotate))))

	// Dashboard — recipes.
	mux.Handle("GET /api/v1/dashboard/recipes", authed(http.HandlerFunc(app.DashRecipeList)))
	mux.Handle("POST /api/v1/dashboard/recipes", authed(csrf(http.HandlerFunc(app.DashRecipeCreate))))
	mux.Handle("GET /api/v1/dashboard/recipes/{id}", authed(http.HandlerFunc(app.DashRecipeGet)))
	mux.Handle("PUT /api/v1/dashboard/recipes/{id}", authed(csrf(http.HandlerFunc(app.DashRecipeUpdate))))
	mux.Handle("PATCH /api/v1/dashboard/recipes/{id}/toggle", authed(csrf(http.HandlerFunc(app.DashRecipeToggle))))
	mux.Handle("PATCH /api/v1/dashboard/recipes/{id}/theme", authed(csrf(http.HandlerFunc(app.DashRecipeTheme))))
	mux.Handle("DELETE /api/v1/dashboard/recipes/{id}", authed(csrf(http.HandlerFunc(app.DashRecipeDelete))))
	mux.Handle("POST /api/v1/dashboard/recipes/{id}/attempts", authed(csrf(http.HandlerFunc(app.DashAttemptAdd))))
	mux.Handle("DELETE /api/v1/dashboard/recipes/{id}/attempts/{aid}", authed(csrf(http.HandlerFunc(app.DashAttemptDelete))))
	mux.Handle("POST /api/v1/dashboard/recipes/{id}/photos", authed(csrf(http.HandlerFunc(app.DashRecipePhotoUpload))))
	mux.Handle("DELETE /api/v1/dashboard/recipes/{id}/photos/{photoID}", authed(csrf(http.HandlerFunc(app.DashRecipePhotoDelete))))

	// Dashboard — projects.
	mux.Handle("GET /api/v1/dashboard/projects", authed(http.HandlerFunc(app.DashProjectList)))
	mux.Handle("POST /api/v1/dashboard/projects", authed(csrf(http.HandlerFunc(app.DashProjectCreate))))
	mux.Handle("GET /api/v1/dashboard/projects/{id}", authed(http.HandlerFunc(app.DashProjectGet)))
	mux.Handle("PUT /api/v1/dashboard/projects/{id}", authed(csrf(http.HandlerFunc(app.DashProjectUpdate))))
	mux.Handle("PATCH /api/v1/dashboard/projects/{id}/toggle", authed(csrf(http.HandlerFunc(app.DashProjectToggle))))
	mux.Handle("PATCH /api/v1/dashboard/projects/{id}/theme", authed(csrf(http.HandlerFunc(app.DashProjectTheme))))
	mux.Handle("DELETE /api/v1/dashboard/projects/{id}", authed(csrf(http.HandlerFunc(app.DashProjectDelete))))

	// Dashboard — custom pages.
	mux.Handle("GET /api/v1/dashboard/custom-pages", authed(http.HandlerFunc(app.DashCustomPageList)))
	mux.Handle("GET /api/v1/dashboard/custom-pages/kinds", authed(http.HandlerFunc(app.DashCustomPageKinds)))
	mux.Handle("POST /api/v1/dashboard/custom-pages", authed(csrf(http.HandlerFunc(app.DashCustomPageCreate))))
	mux.Handle("PUT /api/v1/dashboard/custom-pages/nav", authed(csrf(http.HandlerFunc(app.DashCustomNav))))
	mux.Handle("GET /api/v1/dashboard/custom-pages/{id}", authed(http.HandlerFunc(app.DashCustomPageGet)))
	mux.Handle("PUT /api/v1/dashboard/custom-pages/{id}", authed(csrf(http.HandlerFunc(app.DashCustomPageUpdate))))
	mux.Handle("PATCH /api/v1/dashboard/custom-pages/{id}/toggle", authed(csrf(http.HandlerFunc(app.DashCustomPageToggle))))
	mux.Handle("PATCH /api/v1/dashboard/custom-pages/{id}/theme", authed(csrf(http.HandlerFunc(app.DashCustomPageTheme))))
	mux.Handle("DELETE /api/v1/dashboard/custom-pages/{id}", authed(csrf(http.HandlerFunc(app.DashCustomPageDelete))))
	mux.Handle("POST /api/v1/dashboard/custom-pages/{id}/entries", authed(csrf(http.HandlerFunc(app.DashEntryCreate))))
	mux.Handle("PUT /api/v1/dashboard/custom-pages/{id}/entries/{eid}", authed(csrf(http.HandlerFunc(app.DashEntryUpdate))))
	mux.Handle("DELETE /api/v1/dashboard/custom-pages/{id}/entries/{eid}", authed(csrf(http.HandlerFunc(app.DashEntryDelete))))

	// Dashboard — homepage builder.
	mux.Handle("GET /api/v1/dashboard/homepage", authed(http.HandlerFunc(app.DashHomepage)))
	mux.Handle("PUT /api/v1/dashboard/homepage", authed(csrf(http.HandlerFunc(app.DashHomepageSave))))

	// Dashboard — nav config.
	mux.Handle("GET /api/v1/dashboard/nav-config", authed(http.HandlerFunc(app.DashNavConfigGet)))
	mux.Handle("PUT /api/v1/dashboard/nav-config", authed(csrf(http.HandlerFunc(app.DashNavConfigSave))))

	// ── Admin API ─────────────────────────────────────────────────────────────────
	mux.Handle("GET /api/v1/admin/users", admin(http.HandlerFunc(app.AdminUsers)))
	mux.Handle("POST /api/v1/admin/users/{id}/approve", admin(csrf(http.HandlerFunc(app.AdminUserApprove))))
	mux.Handle("POST /api/v1/admin/users/{id}/suspend", admin(csrf(http.HandlerFunc(app.AdminUserSuspend))))
	mux.Handle("DELETE /api/v1/admin/users/{id}", admin(csrf(http.HandlerFunc(app.AdminUserDelete))))
	mux.Handle("GET /api/v1/admin/content", admin(http.HandlerFunc(app.AdminContent)))
	mux.Handle("DELETE /api/v1/admin/content/posts/{id}", admin(csrf(http.HandlerFunc(app.AdminPostDelete))))
	mux.Handle("DELETE /api/v1/admin/content/photos/{id}", admin(csrf(http.HandlerFunc(app.AdminPhotoDelete))))
	mux.Handle("DELETE /api/v1/admin/content/recipes/{id}", admin(csrf(http.HandlerFunc(app.AdminRecipeDelete))))
	mux.Handle("GET /api/v1/admin/settings", admin(http.HandlerFunc(app.AdminSettings)))
	mux.Handle("PUT /api/v1/admin/settings", admin(csrf(http.HandlerFunc(app.AdminSettingsSave))))
	mux.Handle("GET /api/v1/admin/appearance", admin(http.HandlerFunc(app.AdminSiteAppearanceGet)))
	mux.Handle("PUT /api/v1/admin/appearance", admin(csrf(http.HandlerFunc(app.AdminSiteAppearanceSave))))

	// ── SPA catch-all ────────────────────────────────────────────────────────────
	// Serve index.html for all routes not handled above so the React router works.
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, cfg.BaseDir+"/frontend/dist/index.html")
	})

	// Background goroutine: purge expired sessions hourly.
	go func() {
		for range time.Tick(time.Hour) {
			if err := models.DeleteExpiredSessions(db); err != nil {
				log.Printf("purge sessions: %v", err)
			}
		}
	}()

	// Apply body size limits at the server level based on path.
	// Upload endpoints allow up to 200 MB; all other routes allow 4 MB.
	// This avoids nested MaxBytesReader calls where the outer limit would win.
	const uploadLimit = 200 * 1024 * 1024
	const defaultLimit = 4 * 1024 * 1024
	handler := requestLogger(securityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		limit := int64(defaultLimit)
		p := r.URL.Path
		if p == "/api/v1/dashboard/avatar" ||
			p == "/api/v1/dashboard/blog/image" ||
			p == "/api/v1/dashboard/gallery/photos" ||
			(strings.HasPrefix(p, "/api/v1/dashboard/recipes/") && strings.HasSuffix(p, "/photos")) {
			limit = uploadLimit
		}
		r.Body = http.MaxBytesReader(w, r.Body, limit)
		mux.ServeHTTP(w, r)
	})))

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 30 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
		// ReadTimeout is intentionally omitted (zero = unlimited) so large
		// file uploads are not killed mid-transfer. The MaxBytesReader in the
		// handler enforces the body size limit instead.
	}

	log.Printf("Charlotte starting on :%s (data: %s)", cfg.Port, cfg.DataDir)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}
