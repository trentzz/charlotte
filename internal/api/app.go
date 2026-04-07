// Package api implements the JSON REST API handlers for Charlotte.
package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	stdhtml "html"
	"net/http"
	"regexp"
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
// "style" is intentionally not allowed globally — it would permit CSS injection.
// Only scoped text-alignment styles are permitted on common content elements.
var htmlSanitiser = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowRelativeURLs(true)
	p.AllowAttrs("class").Globally()
	p.AllowAttrs("src", "alt", "width", "height", "loading").OnElements("img")
	p.AllowStyles("text-align").OnElements("p", "div", "span", "h1", "h2", "h3", "h4", "blockquote")
	return p
}()

// sanitizeContent sanitises HTML produced by the WYSIWYG editor before storage.
func sanitizeContent(s string) string {
	return htmlSanitiser.Sanitize(s)
}

// renderContent renders stored content as safe HTML for display.
// Content saved by the WYSIWYG editor starts with "<"; legacy content is markdown.
// All output is run through the bluemonday sanitiser before returning.
func renderContent(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if strings.HasPrefix(s, "<") {
		return htmlSanitiser.Sanitize(s)
	}
	var buf bytes.Buffer
	if err := md.Convert([]byte(s), &buf); err != nil {
		return stdhtml.EscapeString(s)
	}
	return htmlSanitiser.Sanitize(buf.String())
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

// allowedSlugTables is the set of tables that slugUnique may query.
var allowedSlugTables = map[string]string{
	"blog_posts":    "blog_posts",
	"recipes":       "recipes",
	"projects":      "projects",
	"gallery_albums": "gallery_albums",
}

// slugUnique checks whether slug is already taken by another row in table.
// table must be one of the known allowed values; any other value returns an error.
func slugUnique(db *sql.DB, table string, userID, exceptID int64, slug string) (bool, error) {
	validated, ok := allowedSlugTables[table]
	if !ok {
		return false, fmt.Errorf("slugUnique: unknown table %q", table)
	}
	q := "SELECT COUNT(*) FROM " + validated + " WHERE user_id = ? AND slug = ?"
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

// isUniqueConstraintError reports whether err is a SQLite UNIQUE constraint violation.
func isUniqueConstraintError(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
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

// fontNameRE validates font names: letters, digits, spaces, and hyphens only.
var fontNameRE = regexp.MustCompile(`^[A-Za-z0-9 \-]+$`)

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

// validateAndClampTheme validates font names and clamps HSL/size values to safe ranges.
func validateAndClampTheme(body models.UserTheme) (models.UserTheme, error) {
	if body.FontBody != "" && !fontNameRE.MatchString(body.FontBody) {
		return models.UserTheme{}, fmt.Errorf("invalid font name")
	}
	if body.FontDisplay != "" && !fontNameRE.MatchString(body.FontDisplay) {
		return models.UserTheme{}, fmt.Errorf("invalid font name")
	}
	if body.FontUI != "" && !fontNameRE.MatchString(body.FontUI) {
		return models.UserTheme{}, fmt.Errorf("invalid font name")
	}
	theme := models.DefaultTheme()
	theme.AccentH = clamp(body.AccentH, 0, 360)
	theme.AccentS = clamp(body.AccentS, 0, 100)
	theme.AccentL = clamp(body.AccentL, 0, 100)
	theme.BgH = clamp(body.BgH, 0, 360)
	theme.BgS = clamp(body.BgS, 0, 100)
	theme.BgL = clamp(body.BgL, 0, 100)
	theme.DarkAccentH = clamp(body.DarkAccentH, 0, 360)
	theme.DarkAccentS = clamp(body.DarkAccentS, 0, 100)
	theme.DarkAccentL = clamp(body.DarkAccentL, 0, 100)
	theme.DarkBgH = clamp(body.DarkBgH, 0, 360)
	theme.DarkBgS = clamp(body.DarkBgS, 0, 100)
	theme.DarkBgL = clamp(body.DarkBgL, 0, 100)
	theme.TextH = clamp(body.TextH, 0, 360)
	theme.TextS = clamp(body.TextS, 0, 100)
	theme.TextL = clamp(body.TextL, 0, 100)
	theme.HeadingH = clamp(body.HeadingH, 0, 360)
	theme.HeadingS = clamp(body.HeadingS, 0, 100)
	theme.HeadingL = clamp(body.HeadingL, 0, 100)
	theme.DarkTextH = clamp(body.DarkTextH, 0, 360)
	theme.DarkTextS = clamp(body.DarkTextS, 0, 100)
	theme.DarkTextL = clamp(body.DarkTextL, 0, 100)
	theme.DarkHeadingH = clamp(body.DarkHeadingH, 0, 360)
	theme.DarkHeadingS = clamp(body.DarkHeadingS, 0, 100)
	theme.DarkHeadingL = clamp(body.DarkHeadingL, 0, 100)
	theme.FontSize = clamp(body.FontSize, 12, 24)
	theme.NavFontSize = clamp(body.NavFontSize, 10, 20)
	if body.FontBody != "" {
		theme.FontBody = body.FontBody
	}
	if body.FontDisplay != "" {
		theme.FontDisplay = body.FontDisplay
	}
	if body.FontUI != "" {
		theme.FontUI = body.FontUI
	}
	theme.DefaultMode = "light"
	if body.DefaultMode == "dark" {
		theme.DefaultMode = "dark"
	}
	return theme, nil
}

// ── User JSON shape ───────────────────────────────────────────────────────────

// userJSON is the public-facing JSON representation of a user.
type userJSON struct {
	ID             int64             `json:"id"`
	Username       string            `json:"username"`
	DisplayName    string            `json:"display_name"`
	Bio            string            `json:"bio"`
	AvatarURL      string            `json:"avatar_url"`
	Role           models.Role       `json:"role"`
	Status         models.Status     `json:"status"`
	IsAdmin        bool              `json:"is_admin"`
	Features       featuresJSON      `json:"features"`
	Theme          models.UserTheme  `json:"theme"`
	Links          []models.UserLink `json:"links"`
	ShowOnHomepage bool              `json:"show_on_homepage"`
	CreatedAt      string            `json:"created_at"`
}

// userJSONWithEmail extends userJSON with email fields for private/admin endpoints.
type userJSONWithEmail struct {
	userJSON
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
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
		IsAdmin:     u.IsAdmin(),
		Features: featuresJSON{
			Blog:     u.FeatureBlog,
			About:    u.FeatureAbout,
			Gallery:  u.FeatureGallery,
			Recipes:  u.FeatureRecipes,
			Projects: u.FeatureProjects,
		},
		Theme:          u.Theme,
		Links:          links,
		ShowOnHomepage: u.ShowOnHomepage,
		CreatedAt:      u.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

// toUserJSONWithEmail converts a User to the private shape (includes email and verification status).
func toUserJSONWithEmail(u *models.User) userJSONWithEmail {
	return userJSONWithEmail{
		userJSON:      toUserJSON(u),
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
	}
}

// photoURL returns the public URL for a photo.
func photoURL(userID int64, filename string) string {
	return "/uploads/" + strconv.FormatInt(userID, 10) + "/" + filename
}
