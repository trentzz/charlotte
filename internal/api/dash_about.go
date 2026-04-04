package api

import (
	"encoding/json"
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// DashAbout handles GET /api/v1/dashboard/about.
func (a *App) DashAbout(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	about, err := models.GetAboutPage(a.DB, user.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	content := ""
	contentHTML := ""
	if about != nil {
		content = about.Content
		contentHTML = renderContent(about.Content)
	}
	a.respondJSON(w, http.StatusOK, map[string]string{
		"content":      content,
		"content_html": contentHTML,
	})
}

// DashAboutSave handles PUT /api/v1/dashboard/about.
func (a *App) DashAboutSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	content := sanitizeContent(body.Content)
	if err := models.UpsertAboutPage(a.DB, user.ID, content); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{
		"content":      content,
		"content_html": renderContent(content),
	})
}
