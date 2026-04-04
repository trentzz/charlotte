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

// DashProjectList handles GET /api/v1/dashboard/projects — list all projects.
func (a *App) DashProjectList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	projects, err := models.ListProjectsByUser(a.DB, user.ID, false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toProjectList(projects))
}

// DashProjectCreate handles POST /api/v1/dashboard/projects — create a project.
func (a *App) DashProjectCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		URL         string `json:"url"`
		Published   bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	title := strings.TrimSpace(body.Title)
	if title == "" {
		a.respondError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}

	id, err := models.CreateProject(a.DB, &models.Project{
		UserID:      user.ID,
		Title:       title,
		Description: strings.TrimSpace(body.Description),
		URL:         strings.TrimSpace(body.URL),
		Published:   body.Published,
	})
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	proj, err := models.GetProjectByID(a.DB, id)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusCreated, toProjectJSON(proj))
}

// DashProjectGet handles GET /api/v1/dashboard/projects/{id} — single project.
func (a *App) DashProjectGet(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	proj, ok := a.getOwnedProject(w, r, user)
	if !ok {
		return
	}
	a.respondJSON(w, http.StatusOK, toProjectJSON(proj))
}

// DashProjectUpdate handles PUT /api/v1/dashboard/projects/{id} — update a project.
func (a *App) DashProjectUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	proj, ok := a.getOwnedProject(w, r, user)
	if !ok {
		return
	}

	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		URL         string `json:"url"`
		Published   bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	proj.Title = strings.TrimSpace(body.Title)
	proj.Description = strings.TrimSpace(body.Description)
	proj.URL = strings.TrimSpace(body.URL)
	proj.Published = body.Published

	if err := models.UpdateProject(a.DB, proj); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toProjectJSON(proj))
}

// DashProjectToggle handles PATCH /api/v1/dashboard/projects/{id}/toggle — flip published.
func (a *App) DashProjectToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	proj, ok := a.getOwnedProject(w, r, user)
	if !ok {
		return
	}
	if err := models.SetProjectPublished(a.DB, proj.ID, !proj.Published); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"published": !proj.Published})
}

// DashProjectDelete handles DELETE /api/v1/dashboard/projects/{id}.
func (a *App) DashProjectDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	proj, ok := a.getOwnedProject(w, r, user)
	if !ok {
		return
	}
	deleted, err := models.DeleteProject(a.DB, proj.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	if deleted.ImagePath != "" {
		_ = storage.DeleteUpload(a.DataDir, deleted.UserID, deleted.ImagePath)
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "project deleted"})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (a *App) getOwnedProject(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Project, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "project not found")
		return nil, false
	}
	proj, err := models.GetProjectByID(a.DB, id)
	if err != nil || proj.UserID != user.ID {
		a.respondError(w, http.StatusNotFound, "project not found")
		return nil, false
	}
	return proj, true
}
