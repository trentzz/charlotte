package api

import (
	"encoding/json"
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

// Settings handles GET /api/v1/settings — returns site-wide settings and the
// site theme so the landing page can apply it.
func (a *App) Settings(w http.ResponseWriter, r *http.Request) {
	settings, err := models.GetSiteSettings(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	siteTheme, err := models.GetSiteTheme(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	resp := map[string]any{
		"site_name":         settings.SiteName,
		"registration_open": settings.RegistrationOpen,
		"site_description":  settings.SiteDescription,
		"site_theme":        siteTheme,
	}

	a.respondJSON(w, http.StatusOK, resp)
}

// UserList handles GET /api/v1/users — returns all active users who have opted
// in to appear on the homepage (show_on_homepage = 1), public fields only.
func (a *App) UserList(w http.ResponseWriter, r *http.Request) {
	users, err := models.ListVisibleUsers(a.DB)
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

// AdminSiteAppearanceGet handles GET /api/v1/admin/appearance — returns the current site theme.
func (a *App) AdminSiteAppearanceGet(w http.ResponseWriter, r *http.Request) {
	theme, err := models.GetSiteTheme(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, theme)
}

// AdminSiteAppearanceSave handles PUT /api/v1/admin/appearance — saves the site theme.
func (a *App) AdminSiteAppearanceSave(w http.ResponseWriter, r *http.Request) {
	var body models.UserTheme
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	theme := models.DefaultSiteTheme()
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

	if err := models.SaveSiteTheme(a.DB, theme); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, theme)
}
