// Package api implements the JSON REST API handlers for Charlotte.
package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"

	"github.com/trentzz/charlotte/internal/models"
)

// App holds shared dependencies injected into all handlers.
type App struct {
	DB      *sql.DB
	DataDir string
}

// respondJSON writes a successful JSON response with the standard envelope.
func (a *App) respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"data": data})
}

// respondError writes a JSON error response.
func (a *App) respondError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// logError logs an internal server error and writes a 500 JSON response.
func (a *App) internalError(w http.ResponseWriter, r *http.Request, err error) {
	fmt.Printf("internal error on %s: %v\n", r.URL.Path, err)
	a.respondError(w, http.StatusInternalServerError, "something went wrong")
}

// ── Content rendering helpers ─────────────────────────────────────────────────

// md is the shared goldmark instance for rendering legacy markdown content.
var md = goldmark.New(
	goldmark.WithExtensions(
		extension.GFM,
		extension.Footnote,
	),
	goldmark.WithParserOptions(
		parser.WithAutoHeadingID(),
	),
	goldmark.WithRendererOptions(
		html.WithHardWraps(),
		html.WithXHTML(),
	),
)

// htmlSanitiser is the bluemonday policy for sanitising WYSIWYG HTML output on save.
var htmlSanitiser = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowRelativeURLs(true)
	p.AllowAttrs("class", "style").Globally()
	p.AllowAttrs("src", "alt", "width", "height", "loading").OnElements("img")
	return p
}()

// sanitizeContent sanitises HTML produced by the WYSIWYG editor before storage.
func sanitizeContent(s string) string {
	return htmlSanitiser.Sanitize(s)
}

// renderContent renders stored content as safe HTML for display.
// Content saved by the WYSIWYG editor starts with "<" and is returned as-is.
// Legacy markdown is rendered via goldmark.
func renderContent(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if strings.HasPrefix(s, "<") {
		return s
	}
	var buf bytes.Buffer
	if err := md.Convert([]byte(s), &buf); err != nil {
		return s
	}
	return buf.String()
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

// slugUnique checks whether slug is already taken by another row in table.
func slugUnique(db *sql.DB, table string, userID, exceptID int64, slug string) (bool, error) {
	q := "SELECT COUNT(*) FROM " + table + " WHERE user_id = ? AND slug = ?"
	args := []any{userID, slug}
	if exceptID > 0 {
		q += " AND id != ?"
		args = append(args, exceptID)
	}
	var count int
	err := db.QueryRow(q, args...).Scan(&count)
	return count == 0, err
}

// makeUniqueSlug ensures base is not already taken for userID in table,
// appending -2, -3, etc. until a free name is found.
func makeUniqueSlug(db *sql.DB, table string, userID, exceptID int64, base string) string {
	candidate := base
	for i := 2; ; i++ {
		ok, err := slugUnique(db, table, userID, exceptID, candidate)
		if err != nil || ok {
			return candidate
		}
		candidate = base + "-" + strconv.Itoa(i)
	}
}

// ── String helpers ───────────────────────────────────────────────────────────

// parseStringOrArray accepts a JSON value that is either a plain string or a
// JSON array of strings and always returns a newline-delimited string.
// This lets the API accept both legacy plain-text and array payloads.
func parseStringOrArray(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	// Try array first.
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil {
		return strings.Join(arr, "\n")
	}
	// Fall back to plain string.
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return string(raw)
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

// clamp returns v clamped to [min, max].
func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// ── User JSON shape ───────────────────────────────────────────────────────────

// userJSON is the public-facing JSON representation of a user.
type userJSON struct {
	ID          int64            `json:"id"`
	Username    string           `json:"username"`
	DisplayName string           `json:"display_name"`
	Bio         string           `json:"bio"`
	AvatarURL   string           `json:"avatar_url"`
	Role        models.Role      `json:"role"`
	Status      models.Status    `json:"status"`
	Features    featuresJSON     `json:"features"`
	Theme       models.UserTheme `json:"theme"`
	Links       []models.UserLink `json:"links"`
	CreatedAt   string           `json:"created_at"`
}

// userJSONWithEmail extends userJSON with an email field for private/admin endpoints.
type userJSONWithEmail struct {
	userJSON
	Email string `json:"email"`
}

type featuresJSON struct {
	Blog     bool `json:"blog"`
	About    bool `json:"about"`
	Gallery  bool `json:"gallery"`
	Recipes  bool `json:"recipes"`
	Projects bool `json:"projects"`
}

// toUserJSON converts a User model to the public JSON shape.
func toUserJSON(u *models.User) userJSON {
	avatarURL := ""
	if u.AvatarPath != "" {
		avatarURL = "/uploads/" + strconv.FormatInt(u.ID, 10) + "/" + u.AvatarPath
	}
	links := u.Links
	if links == nil {
		links = []models.UserLink{}
	}
	return userJSON{
		ID:          u.ID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		Bio:         u.Bio,
		AvatarURL:   avatarURL,
		Role:        u.Role,
		Status:      u.Status,
		Features: featuresJSON{
			Blog:     u.FeatureBlog,
			About:    u.FeatureAbout,
			Gallery:  u.FeatureGallery,
			Recipes:  u.FeatureRecipes,
			Projects: u.FeatureProjects,
		},
		Theme:     u.Theme,
		Links:     links,
		CreatedAt: u.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

// toUserJSONWithEmail converts a User to the private shape (includes email).
func toUserJSONWithEmail(u *models.User) userJSONWithEmail {
	return userJSONWithEmail{
		userJSON: toUserJSON(u),
		Email:    u.Email,
	}
}

// photoURL returns the public URL for a photo.
func photoURL(userID int64, filename string) string {
	return "/uploads/" + strconv.FormatInt(userID, 10) + "/" + filename
}
