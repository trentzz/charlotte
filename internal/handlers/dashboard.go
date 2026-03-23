package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/storage"
)

type dashHomeData struct {
	PageData
	PostCount   int
	PhotoCount  int
	RecipeCount int
}

// DashboardHome renders GET /dashboard/.
func (a *App) DashboardHome(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	pd := a.newPage(r, "Dashboard")
	pd.Flash = flashFromRequest(r)

	posts, _ := models.ListPostsByUser(a.DB, user.ID, false)
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 1)
	recipes, _ := models.ListRecipesByUser(a.DB, user.ID, false)

	// Count photos properly.
	photoCount := 0
	if len(photos) > 0 {
		// Rough count — exact count would need a separate query.
		recent, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 9999)
		photoCount = len(recent)
	}

	a.Tmpl.Render(w, http.StatusOK, "dashboard/home", dashHomeData{
		PageData:    pd,
		PostCount:   len(posts),
		PhotoCount:  photoCount,
		RecipeCount: len(recipes),
	})
}

// DashboardFeatures renders GET /dashboard/features.
// We fold this into the dashboard home page via a form section.
func (a *App) DashboardFeatures(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/dashboard/", http.StatusSeeOther)
}

// DashboardFeaturesSave handles POST /dashboard/features.
func (a *App) DashboardFeaturesSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	blog := r.FormValue("feature_blog") == "1"
	about := r.FormValue("feature_about") == "1"
	gallery := r.FormValue("feature_gallery") == "1"
	recipes := r.FormValue("feature_recipes") == "1"

	if err := models.UpdateUserFeatures(a.DB, user.ID, blog, about, gallery, recipes); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/?flash=Features+updated.", http.StatusSeeOther)
}

type dashProfileData struct {
	PageData
	Profile *models.User
}

// DashboardProfile renders GET /dashboard/profile.
func (a *App) DashboardProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	pd := a.newPage(r, "Edit Profile")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/profile", dashProfileData{PageData: pd, Profile: user})
}

// DashboardProfileSave handles POST /dashboard/profile.
func (a *App) DashboardProfileSave(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	user.DisplayName = strings.TrimSpace(r.FormValue("display_name"))
	user.Bio = strings.TrimSpace(r.FormValue("bio"))

	// Parse links: expect pairs of label/url fields like link_label_0, link_url_0.
	var links []models.UserLink
	for i := 0; i < 10; i++ {
		label := strings.TrimSpace(r.FormValue("link_label_" + itoa(i)))
		url := strings.TrimSpace(r.FormValue("link_url_" + itoa(i)))
		if label != "" && url != "" {
			links = append(links, models.UserLink{Label: label, URL: url})
		}
	}
	user.Links = links

	if err := models.UpdateUser(a.DB, user); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/profile?flash=Profile+saved.", http.StatusSeeOther)
}

// DashboardAvatarUpload handles POST /dashboard/avatar.
func (a *App) DashboardAvatarUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseMultipartForm(storage.MaxUploadBytes + (1 << 20)); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	_, fhdr, err := r.FormFile("avatar")
	if err != nil {
		http.Redirect(w, r, "/dashboard/profile?flash=No+file+selected.", http.StatusSeeOther)
		return
	}

	result, err := storage.SaveUpload(a.DataDir, user.ID, fhdr)
	if err != nil {
		http.Redirect(w, r, "/dashboard/profile?flash="+err.Error(), http.StatusSeeOther)
		return
	}

	// Remove old avatar if it exists.
	if user.AvatarPath != "" {
		_ = storage.DeleteUpload(a.DataDir, user.ID, user.AvatarPath)
	}

	user.AvatarPath = result.Filename
	if err := models.UpdateUser(a.DB, user); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/profile?flash=Avatar+updated.", http.StatusSeeOther)
}

// DashboardLinksAPI handles GET /dashboard/links (returns current links as JSON).
// Used for the dynamic link editor in the profile form.
func (a *App) DashboardLinksJSON(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user.Links)
}

func itoa(i int) string {
	const digits = "0123456789"
	if i < 10 {
		return string(digits[i])
	}
	return strings.Repeat("x", i) // not expected beyond 9
}
