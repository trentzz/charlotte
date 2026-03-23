package handlers

import (
	"html/template"
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

type aboutData struct {
	PageData
	Profile          *models.User
	About            *models.AboutPage
	ContentHTML      template.HTML // rendered for display
	ContentForEditor template.HTML // HTML loaded into editor
	IsOwner          bool
	EditMode         bool
}

// AboutPage renders /u/{username}/about.
func (a *App) AboutPage(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureAbout {
		a.NotFound(w, r)
		return
	}

	about, err := models.GetAboutPage(a.DB, profile.ID)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	editMode := isOwner && r.URL.Query().Get("edit") == "1"

	var contentHTML, contentForEd template.HTML
	if about != nil {
		contentHTML = renderContent(about.Content)
		contentForEd = contentForEditor(about.Content)
	}

	a.Tmpl.Render(w, http.StatusOK, "user/about", aboutData{
		PageData:         a.newPage(r, "About "+profile.DisplayOrUsername()),
		Profile:          profile,
		About:            about,
		ContentHTML:      contentHTML,
		ContentForEditor: contentForEd,
		IsOwner:          isOwner,
		EditMode:         editMode,
	})
}

// AboutInlineSave handles POST /u/{username}/about — inline edit from public page.
func (a *App) AboutInlineSave(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	viewer := middleware.UserFromContext(r.Context())
	if viewer == nil {
		a.Forbidden(w, r)
		return
	}
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if viewer.ID != profile.ID && !viewer.IsAdmin() {
		a.Forbidden(w, r)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	content := sanitizeContent(r.FormValue("content"))
	if err := models.UpsertAboutPage(a.DB, profile.ID, content); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/u/"+username+"/about", http.StatusSeeOther)
}

// DashboardAbout renders GET /dashboard/about.
func (a *App) DashboardAbout(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	about, err := models.GetAboutPage(a.DB, user.ID)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	var contentForEd template.HTML
	if about != nil {
		contentForEd = contentForEditor(about.Content)
	}
	pd := a.newPage(r, "Edit About Page")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/about", aboutData{
		PageData:         pd,
		Profile:          user,
		About:            about,
		ContentForEditor: contentForEd,
	})
}

// DashboardAboutSave handles POST /dashboard/about.
func (a *App) DashboardAboutSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	content := sanitizeContent(r.FormValue("content"))
	if err := models.UpsertAboutPage(a.DB, user.ID, content); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/about?flash=About+page+saved.", http.StatusSeeOther)
}
