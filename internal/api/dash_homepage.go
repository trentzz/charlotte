package api

import (
	"encoding/json"
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// DashHomepage handles GET /api/v1/dashboard/homepage.
// Returns the current layout plus all content the user can pin.
func (a *App) DashHomepage(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	layout, err := models.GetHomepageLayout(a.DB, user.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	// Load available content for the picker.
	posts, _ := models.ListPostsByUser(a.DB, user.ID, false)
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 50)
	albums, _ := models.ListAlbumsByUser(a.DB, user.ID, false)
	recipes, _ := models.ListRecipesByUser(a.DB, user.ID, false)
	projs, _ := models.ListProjectsByUser(a.DB, user.ID, false)

	a.respondJSON(w, http.StatusOK, map[string]any{
		"layout":   layout,
		"posts":    toPostList(posts),
		"photos":   toPhotoList(photos),
		"albums":   toAlbumList(albums),
		"recipes":  toRecipeList(recipes),
		"projects": toProjectList(projs),
	})
}

// DashHomepageSave handles PUT /api/v1/dashboard/homepage.
func (a *App) DashHomepageSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		Widgets []models.Widget `json:"widgets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	layout := &models.HomepageLayout{Widgets: body.Widgets}
	if layout.Widgets == nil {
		layout.Widgets = []models.Widget{}
	}

	if err := models.SaveHomepageLayout(a.DB, user.ID, layout); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, layout)
}
