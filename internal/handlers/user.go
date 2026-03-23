package handlers

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/models"
)

// userContext holds the resolved profile user and their recent content.
type userContext struct {
	PageData
	Profile *models.User
}

// resolveProfile looks up the profile user by username and returns nil (already
// written a 404) if not found or not active.
func (a *App) resolveProfile(w http.ResponseWriter, r *http.Request, username string) *models.User {
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.NotFound(w, r)
		return nil
	}
	return profile
}

type userHomeData struct {
	PageData
	Profile       *models.User
	RecentPosts   []*models.Post
	RecentPhotos  []*models.Photo
	RecentRecipes []*models.Recipe
}

// UserHome renders /u/{username}/.
func (a *App) UserHome(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}

	data := userHomeData{
		PageData: a.newPage(r, profile.DisplayOrUsername()),
		Profile:  profile,
	}

	if profile.FeatureBlog {
		posts, _ := models.ListPostsByUser(a.DB, profile.ID, true)
		if len(posts) > 3 {
			posts = posts[:3]
		}
		data.RecentPosts = posts
	}
	if profile.FeatureGallery {
		photos, _ := models.ListRecentPhotosByUser(a.DB, profile.ID, 6)
		data.RecentPhotos = photos
	}
	if profile.FeatureRecipes {
		recipes, _ := models.ListRecipesByUser(a.DB, profile.ID, true)
		if len(recipes) > 3 {
			recipes = recipes[:3]
		}
		data.RecentRecipes = recipes
	}

	a.Tmpl.Render(w, http.StatusOK, "user/home", data)
}
