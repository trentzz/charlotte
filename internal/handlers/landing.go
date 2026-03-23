package handlers

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

type landingData struct {
	PageData
	Users []*models.User
}

// Landing renders the public homepage.
func (a *App) Landing(w http.ResponseWriter, r *http.Request) {
	// Serve 404 for any sub-path that isn't caught by a more specific route.
	if r.URL.Path != "/" {
		a.NotFound(w, r)
		return
	}

	users, err := models.ListActiveUsers(a.DB)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}

	data := landingData{
		PageData: a.newPage(r, "Home"),
		Users:    users,
	}
	data.PageData.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "landing", data)
}
