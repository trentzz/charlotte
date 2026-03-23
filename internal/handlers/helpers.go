// Package handlers implements all HTTP request handlers.
package handlers

import (
	"bytes"
	"database/sql"
	"html/template"
	"net/http"
	"strconv"
	"strings"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/tmpl"
)

// md is the shared goldmark instance used to render legacy markdown content.
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

// htmlSanitiser is the bluemonday policy used to sanitise WYSIWYG HTML output on save.
var htmlSanitiser = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowRelativeURLs(true)
	p.AllowAttrs("class", "style").Globally()
	// Allow images from our own upload path.
	p.AllowAttrs("src", "alt", "width", "height", "loading").OnElements("img")
	return p
}()

// sanitizeContent sanitises HTML produced by the WYSIWYG editor before storage.
func sanitizeContent(s string) string {
	return htmlSanitiser.Sanitize(s)
}

// renderContent renders stored content as safe HTML for display.
// Content saved by the WYSIWYG editor starts with "<" and is returned as-is
// (it was sanitised on save). Legacy markdown content is rendered via goldmark.
func renderContent(s string) template.HTML {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if strings.HasPrefix(s, "<") {
		return template.HTML(s) //nolint:gosec // sanitised by bluemonday on save
	}
	return renderMarkdown(s)
}

// contentForEditor converts stored content to HTML for loading into the WYSIWYG editor.
// Legacy markdown is rendered to HTML; HTML content is passed through.
func contentForEditor(s string) template.HTML {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if strings.HasPrefix(s, "<") {
		return template.HTML(s) //nolint:gosec // sanitised by bluemonday on save
	}
	return renderMarkdown(s) // convert legacy markdown to HTML for the editor
}

// renderMarkdown converts markdown src to safe HTML (used for legacy content).
func renderMarkdown(src string) template.HTML {
	var buf bytes.Buffer
	if err := md.Convert([]byte(src), &buf); err != nil {
		return template.HTML(template.HTMLEscapeString(src))
	}
	return template.HTML(buf.String()) //nolint:gosec // goldmark escapes unsafe HTML
}

// App holds shared dependencies injected into all handlers.
type App struct {
	DB      *sql.DB
	Tmpl    *tmpl.Renderer
	DataDir string
}

// PageData is the base template data included in every page render.
type PageData struct {
	Title    string
	User     *models.User // currently logged-in user (may be nil)
	Settings *models.SiteSettings
	Flash    string
	CSRF     string
}

// newPage builds a PageData for a request.
func (a *App) newPage(r *http.Request, title string) PageData {
	settings, _ := models.GetSiteSettings(a.DB)
	if settings == nil {
		settings = &models.SiteSettings{SiteName: "Charlotte"}
	}
	return PageData{
		Title:    title + " — " + settings.SiteName,
		User:     middleware.UserFromContext(r.Context()),
		Settings: settings,
		CSRF:     middleware.CSRFToken(r),
	}
}

// slugUnique checks whether a slug is already taken by another post/recipe/etc.
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

// redirectWithFlash redirects to url with a flash query param.
func redirectWithFlash(w http.ResponseWriter, r *http.Request, url, flash string) {
	if flash != "" {
		if strings.Contains(url, "?") {
			url += "&flash=" + flash
		} else {
			url += "?flash=" + flash
		}
	}
	http.Redirect(w, r, url, http.StatusSeeOther)
}

// flashFromRequest extracts an optional flash message from the query string.
func flashFromRequest(r *http.Request) string {
	return r.URL.Query().Get("flash")
}
