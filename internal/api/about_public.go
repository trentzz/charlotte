package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

// AboutPage handles GET /api/v1/u/{username}/about.
func (a *App) AboutPage(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureAbout {
		a.respondError(w, http.StatusNotFound, "about page not enabled for this user")
		return
	}

	about, err := models.GetAboutPage(a.DB, profile.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	content := ""
	contentHTML := ""
	updatedAt := ""
	if about != nil {
		content = about.Content
		contentHTML = renderContent(about.Content)
		updatedAt = about.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z")
	}

	a.respondJSON(w, http.StatusOK, map[string]string{
		"content":     content,
		"content_html": contentHTML,
		"updated_at":  updatedAt,
	})
}
