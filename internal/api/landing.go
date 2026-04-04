package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

// Settings handles GET /api/v1/settings — returns site-wide settings.
func (a *App) Settings(w http.ResponseWriter, r *http.Request) {
	settings, err := models.GetSiteSettings(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"site_name":         settings.SiteName,
		"registration_open": settings.RegistrationOpen,
		"site_description":  settings.SiteDescription,
	})
}

// UserList handles GET /api/v1/users — returns all active users (public fields only).
func (a *App) UserList(w http.ResponseWriter, r *http.Request) {
	users, err := models.ListActiveUsers(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	out := make([]userJSON, 0, len(users))
	for _, u := range users {
		out = append(out, toUserJSON(u))
	}
	a.respondJSON(w, http.StatusOK, out)
}
