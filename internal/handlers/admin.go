package handlers

import (
	"net/http"
	"strconv"

	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/storage"
)

type adminHomeData struct {
	PageData
	Users      []*models.User
	TotalUsers int
	DiskUsage  map[int64]int64
}

// AdminHome renders GET /admin/.
func (a *App) AdminHome(w http.ResponseWriter, r *http.Request) {
	users, err := models.ListAllUsers(a.DB)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	diskUsage, _ := models.GetDiskUsageByUser(a.DB)
	pd := a.newPage(r, "Admin")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "admin/home", adminHomeData{
		PageData:   pd,
		Users:      users,
		TotalUsers: len(users),
		DiskUsage:  diskUsage,
	})
}

type adminUsersData struct {
	PageData
	Users []*models.User
}

// AdminUsers renders GET /admin/users.
func (a *App) AdminUsers(w http.ResponseWriter, r *http.Request) {
	users, err := models.ListAllUsers(a.DB)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	pd := a.newPage(r, "Users — Admin")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "admin/users", adminUsersData{PageData: pd, Users: users})
}

// AdminUserApprove handles POST /admin/users/{id}/approve.
func (a *App) AdminUserApprove(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	if err := models.UpdateUserStatus(a.DB, id, models.StatusActive); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/admin/users?flash=User+approved.", http.StatusSeeOther)
}

// AdminUserSuspend handles POST /admin/users/{id}/suspend.
func (a *App) AdminUserSuspend(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	if err := models.UpdateUserStatus(a.DB, id, models.StatusSuspended); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/admin/users?flash=User+suspended.", http.StatusSeeOther)
}

// AdminUserDelete handles POST /admin/users/{id}/delete.
func (a *App) AdminUserDelete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	if err := models.DeleteUser(a.DB, id); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/admin/users?flash=User+deleted.", http.StatusSeeOther)
}

type adminContentData struct {
	PageData
	Posts   []*models.Post
	Photos  []*models.Photo
	Recipes []*models.Recipe
}

// AdminContent renders GET /admin/content.
func (a *App) AdminContent(w http.ResponseWriter, r *http.Request) {
	posts, _ := models.ListAllPosts(a.DB)
	photos, _ := models.ListAllPhotos(a.DB)
	recipes, _ := models.ListAllRecipes(a.DB)
	pd := a.newPage(r, "Content — Admin")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "admin/content", adminContentData{
		PageData: pd,
		Posts:    posts,
		Photos:   photos,
		Recipes:  recipes,
	})
}

// AdminPostDelete handles POST /admin/content/post/{id}/delete.
func (a *App) AdminPostDelete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	_ = models.DeletePost(a.DB, id)
	http.Redirect(w, r, "/admin/content?flash=Post+deleted.", http.StatusSeeOther)
}

// AdminPhotoDelete handles POST /admin/content/photo/{id}/delete.
func (a *App) AdminPhotoDelete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	deleted, err := models.DeletePhoto(a.DB, id)
	if err == nil {
		_ = a.deleteUploadFile(deleted)
	}
	http.Redirect(w, r, "/admin/content?flash=Photo+deleted.", http.StatusSeeOther)
}

// AdminRecipeDelete handles POST /admin/content/recipe/{id}/delete.
func (a *App) AdminRecipeDelete(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	_ = models.DeleteRecipe(a.DB, id)
	http.Redirect(w, r, "/admin/content?flash=Recipe+deleted.", http.StatusSeeOther)
}

type adminSettingsData struct {
	PageData
	Settings *models.SiteSettings
}

// AdminSettings renders GET /admin/settings.
func (a *App) AdminSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := models.GetSiteSettings(a.DB)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	pd := a.newPage(r, "Settings — Admin")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "admin/settings", adminSettingsData{PageData: pd, Settings: settings})
}

// AdminSettingsSave handles POST /admin/settings.
func (a *App) AdminSettingsSave(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	s := &models.SiteSettings{
		SiteName:         r.FormValue("site_name"),
		RegistrationOpen: r.FormValue("registration_open") == "1",
		SiteDescription:  r.FormValue("site_description"),
	}
	if err := models.SaveSiteSettings(a.DB, s); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/admin/settings?flash=Settings+saved.", http.StatusSeeOther)
}

// deleteUploadFile removes a photo's file from disk.
func (a *App) deleteUploadFile(p *models.Photo) error {
	if p == nil {
		return nil
	}
	return storage.DeleteUpload(a.DataDir, p.UserID, p.Filename)
}
