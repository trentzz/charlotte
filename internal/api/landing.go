package api

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

// Settings handles GET /api/v1/settings — returns site-wide settings and the
// admin user's theme so the landing page can apply it.
func (a *App) Settings(w http.ResponseWriter, r *http.Request) {
	settings, err := models.GetSiteSettings(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	resp := map[string]any{
		"site_name":         settings.SiteName,
		"registration_open": settings.RegistrationOpen,
		"site_description":  settings.SiteDescription,
	}

	// Include the first admin's theme so the landing page can adopt it.
	admin, adminErr := models.GetFirstAdminUser(a.DB)
	if adminErr == nil {
		resp["admin_theme"] = admin.Theme
	} else if !errors.Is(adminErr, sql.ErrNoRows) {
		// Non-fatal: log and continue without admin theme.
		fmt.Printf("settings: get admin user: %v\n", adminErr)
	}

	a.respondJSON(w, http.StatusOK, resp)
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
