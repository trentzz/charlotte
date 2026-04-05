package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/storage"
)

// DashProfile handles GET /api/v1/dashboard/profile — returns full current user.
func (a *App) DashProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	a.respondJSON(w, http.StatusOK, toUserJSONWithEmail(user))
}

// DashProfileUpdate handles PUT /api/v1/dashboard/profile.
func (a *App) DashProfileUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		DisplayName    string            `json:"display_name"`
		Bio            string            `json:"bio"`
		Links          []models.UserLink `json:"links"`
		ShowOnHomepage *bool             `json:"show_on_homepage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user.DisplayName = strings.TrimSpace(body.DisplayName)
	user.Bio = strings.TrimSpace(body.Bio)
	if body.ShowOnHomepage != nil {
		user.ShowOnHomepage = *body.ShowOnHomepage
	}
	if body.Links != nil {
		// Filter out links with empty label or URL.
		var links []models.UserLink
		for _, l := range body.Links {
			l.Label = strings.TrimSpace(l.Label)
			l.URL = strings.TrimSpace(l.URL)
			if l.Label != "" && l.URL != "" {
				links = append(links, l)
			}
		}
		user.Links = links
	}

	if err := models.UpdateUser(a.DB, user); err != nil {
		a.internalError(w, r, err)
		return
	}

	// Re-fetch to get current state.
	full, err := models.GetUserByID(a.DB, user.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toUserJSONWithEmail(full))
}

// DashAvatarUpload handles POST /api/v1/dashboard/avatar — multipart file upload.
func (a *App) DashAvatarUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseMultipartForm(storage.MaxUploadBytes + (1 << 20)); err != nil {
		a.respondError(w, http.StatusBadRequest, "bad request")
		return
	}

	_, fhdr, err := r.FormFile("avatar")
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "no file selected")
		return
	}

	result, err := storage.SaveUpload(a.DataDir, user.ID, fhdr)
	if err != nil {
		a.respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	if user.AvatarPath != "" {
		_ = storage.DeleteUpload(a.DataDir, user.ID, user.AvatarPath)
	}

	user.AvatarPath = result.Filename
	if err := models.UpdateUser(a.DB, user); err != nil {
		a.internalError(w, r, err)
		return
	}

	a.respondJSON(w, http.StatusOK, map[string]string{
		"avatar_url": "/uploads/" + strconv.FormatInt(user.ID, 10) + "/" + result.Filename,
	})
}

// DashFeatures handles GET /api/v1/dashboard/features — returns feature flags.
func (a *App) DashFeatures(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	a.respondJSON(w, http.StatusOK, featuresJSON{
		Blog:     user.FeatureBlog,
		About:    user.FeatureAbout,
		Gallery:  user.FeatureGallery,
		Recipes:  user.FeatureRecipes,
		Projects: user.FeatureProjects,
	})
}

// DashFeaturesSave handles PUT /api/v1/dashboard/features.
func (a *App) DashFeaturesSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body featuresJSON
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := models.UpdateUserFeatures(a.DB, user.ID, body.Blog, body.About, body.Gallery, body.Recipes, body.Projects); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, body)
}

// DashAppearance handles GET /api/v1/dashboard/appearance — returns current theme.
func (a *App) DashAppearance(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	a.respondJSON(w, http.StatusOK, user.Theme)
}

// DashAppearanceSave handles PUT /api/v1/dashboard/appearance.
func (a *App) DashAppearanceSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body models.UserTheme
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate and clamp values.
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

	if err := models.UpdateUserTheme(a.DB, user.ID, theme); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, theme)
}
