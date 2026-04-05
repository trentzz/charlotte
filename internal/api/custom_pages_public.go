package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

// CustomPageShow handles GET /api/v1/u/{username}/pages/{slug}.
func (a *App) CustomPageShow(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	pageSlug := r.PathValue("slug")

	user, err := models.GetUserByUsername(a.DB, username)
	if err != nil || user == nil {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}

	p, err := models.GetCustomPageBySlug(a.DB, user.ID, pageSlug)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "page not found")
		return
	}
	if !p.Published {
		a.respondError(w, http.StatusNotFound, "page not found")
		return
	}

	var entries []entryJSON
	if p.Format == "list" {
		ents, _ := models.ListEntriesByPage(a.DB, p.ID)
		entries = toEntryList(ents)
	}
	kd, _ := models.KindByName(p.Kind)

	// Render body for freeform pages.
	bodyHTML := ""
	if p.Format == "freeform" {
		bodyHTML = renderContent(p.Body)
	}

	a.respondJSON(w, http.StatusOK, map[string]any{
		"page":      toCustomPageJSON(p),
		"entries":   entries,
		"kind_def":  kd,
		"body_html": bodyHTML,
	})
}
