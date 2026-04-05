package api

import (
	"encoding/json"
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// DashNavConfigGet handles GET /api/v1/dashboard/nav-config.
// Returns the current nav config plus all available content for each section
// so the frontend can build the pinned-items picker.
func (a *App) DashNavConfigGet(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	posts, _ := models.ListPostsByUser(a.DB, user.ID, true)
	projs, _ := models.ListProjectsByUser(a.DB, user.ID, true)
	albums, _ := models.ListTopLevelAlbumsByUser(a.DB, user.ID, true)
	recipes, _ := models.ListRecipesByUser(a.DB, user.ID, true)
	customPages, _ := models.ListCustomPagesByUser(a.DB, user.ID, false)

	type customPageJSON struct {
		ID        int64  `json:"id"`
		Title     string `json:"title"`
		Slug      string `json:"slug"`
		Kind      string `json:"kind"`
		Published bool   `json:"published"`
		NavPinned bool   `json:"nav_pinned"`
	}
	cpList := make([]customPageJSON, 0, len(customPages))
	for _, p := range customPages {
		cpList = append(cpList, customPageJSON{
			ID:        p.ID,
			Title:     p.Title,
			Slug:      p.Slug,
			Kind:      p.Kind,
			Published: p.Published,
			NavPinned: p.NavPinned,
		})
	}

	a.respondJSON(w, http.StatusOK, map[string]any{
		"nav_config":   user.NavConfig,
		"custom_pages": cpList,
		"available": map[string]any{
			"blog":     toPostList(posts),
			"projects": toProjectList(projs),
			"gallery":  toAlbumList(albums),
			"recipes":  toRecipeList(recipes),
		},
	})
}

// DashNavConfigSave handles PUT /api/v1/dashboard/nav-config.
func (a *App) DashNavConfigSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		NavConfig string `json:"nav_config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Validate it is valid JSON.
	var check any
	if err := json.Unmarshal([]byte(body.NavConfig), &check); err != nil {
		a.respondError(w, http.StatusBadRequest, "nav_config must be valid JSON")
		return
	}

	if err := models.UpdateUserNavConfig(a.DB, user.ID, body.NavConfig); err != nil {
		a.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
