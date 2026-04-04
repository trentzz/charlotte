package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// RecipeIndex handles GET /api/v1/u/{username}/recipes — list published recipes.
// The owner also sees drafts.
func (a *App) RecipeIndex(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureRecipes {
		a.respondError(w, http.StatusNotFound, "recipes not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	recipes, err := models.ListRecipesByUser(a.DB, profile.ID, !isOwner)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"recipes":  toRecipeList(recipes),
		"is_owner": isOwner,
	})
}

// RecipePost handles GET /api/v1/u/{username}/recipes/{slug} — single recipe with attempts.
func (a *App) RecipePost(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	recipeSlug := r.PathValue("slug")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureRecipes {
		a.respondError(w, http.StatusNotFound, "recipes not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	recipe, err := models.GetRecipeBySlug(a.DB, profile.ID, recipeSlug)
	if err != nil || (!recipe.Published && !isOwner) {
		a.respondError(w, http.StatusNotFound, "recipe not found")
		return
	}

	a.respondJSON(w, http.StatusOK, map[string]any{
		"recipe":   toRecipeJSON(recipe),
		"is_owner": isOwner,
	})
}
