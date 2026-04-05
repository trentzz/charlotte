package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/storage"
)

// AdminUsers handles GET /api/v1/admin/users — list all users with email.
func (a *App) AdminUsers(w http.ResponseWriter, r *http.Request) {
	users, err := models.ListAllUsers(a.DB)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	out := make([]userJSONWithEmail, 0, len(users))
	for _, u := range users {
		out = append(out, toUserJSONWithEmail(u))
	}
	a.respondJSON(w, http.StatusOK, out)
}

// AdminUserApprove handles POST /api/v1/admin/users/{id}/approve.
func (a *App) AdminUserApprove(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if err := models.UpdateUserStatus(a.DB, id, models.StatusActive); err != nil {
		if err == sql.ErrNoRows {
			a.respondError(w, http.StatusNotFound, "user not found")
			return
		}
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "user approved"})
}

// AdminUserSuspend handles POST /api/v1/admin/users/{id}/suspend.
func (a *App) AdminUserSuspend(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.UserFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if id == viewer.ID {
		a.respondError(w, http.StatusBadRequest, "cannot modify your own account")
		return
	}
	if err := models.UpdateUserStatus(a.DB, id, models.StatusSuspended); err != nil {
		if err == sql.ErrNoRows {
			a.respondError(w, http.StatusNotFound, "user not found")
			return
		}
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "user suspended"})
}

// AdminUserDelete handles DELETE /api/v1/admin/users/{id}.
func (a *App) AdminUserDelete(w http.ResponseWriter, r *http.Request) {
	viewer := middleware.UserFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if id == viewer.ID {
		a.respondError(w, http.StatusBadRequest, "cannot modify your own account")
		return
	}
	if err := models.DeleteUser(a.DB, id); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
}

// AdminContent handles GET /api/v1/admin/content — all content across users.
func (a *App) AdminContent(w http.ResponseWriter, r *http.Request) {
	posts, err := models.ListAllPosts(a.DB)
	if err != nil {
		log.Printf("admin content: list posts: %v", err)
		a.internalError(w, r, err)
		return
	}
	photos, err := models.ListAllPhotos(a.DB)
	if err != nil {
		log.Printf("admin content: list photos: %v", err)
		a.internalError(w, r, err)
		return
	}
	recipes, err := models.ListAllRecipes(a.DB)
	if err != nil {
		log.Printf("admin content: list recipes: %v", err)
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"posts":   toPostList(posts),
		"photos":  toPhotoList(photos),
		"recipes": toRecipeList(recipes),
	})
}

// AdminPostDelete handles DELETE /api/v1/admin/content/posts/{id}.
func (a *App) AdminPostDelete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "post not found")
		return
	}
	if err := models.DeletePost(a.DB, id); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "post deleted"})
}

// AdminPhotoDelete handles DELETE /api/v1/admin/content/photos/{id}.
func (a *App) AdminPhotoDelete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}
	deleted, err := models.DeletePhoto(a.DB, id)
	if err == nil && deleted != nil {
		_ = storage.DeleteUpload(a.DataDir, deleted.UserID, deleted.Filename)
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "photo deleted"})
}

// AdminRecipeDelete handles DELETE /api/v1/admin/content/recipes/{id}.
func (a *App) AdminRecipeDelete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "recipe not found")
		return
	}
	if err := models.DeleteRecipe(a.DB, id); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "recipe deleted"})
}

// AdminSettings handles GET /api/v1/admin/settings — return site settings.
func (a *App) AdminSettings(w http.ResponseWriter, r *http.Request) {
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

// AdminSettingsSave handles PUT /api/v1/admin/settings.
func (a *App) AdminSettingsSave(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SiteName         string `json:"site_name"`
		RegistrationOpen bool   `json:"registration_open"`
		SiteDescription  string `json:"site_description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	s := &models.SiteSettings{
		SiteName:         body.SiteName,
		RegistrationOpen: body.RegistrationOpen,
		SiteDescription:  body.SiteDescription,
	}
	if err := models.SaveSiteSettings(a.DB, s); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"site_name":         s.SiteName,
		"registration_open": s.RegistrationOpen,
		"site_description":  s.SiteDescription,
	})
}
