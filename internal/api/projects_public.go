package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// ProjectsPage handles GET /api/v1/u/{username}/projects — list published projects.
// The owner also sees unpublished projects.
func (a *App) ProjectsPage(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureProjects {
		a.respondError(w, http.StatusNotFound, "projects not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	projects, err := models.ListProjectsByUser(a.DB, profile.ID, !isOwner)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"projects": toProjectList(projects),
		"is_owner": isOwner,
	})
}

// ProjectDetail handles GET /api/v1/u/{username}/projects/{slug} — single project with full body.
func (a *App) ProjectDetail(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	projectSlug := r.PathValue("slug")

	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureProjects {
		a.respondError(w, http.StatusNotFound, "projects not enabled for this user")
		return
	}

	proj, err := models.GetProjectBySlug(a.DB, profile.ID, projectSlug)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "project not found")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	if !proj.Published && !isOwner {
		a.respondError(w, http.StatusNotFound, "project not found")
		return
	}

	a.respondJSON(w, http.StatusOK, map[string]any{
		"project":  toProjectJSON(proj),
		"is_owner": isOwner,
	})
}
