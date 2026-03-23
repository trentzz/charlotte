package handlers

import (
	"html/template"
	"net/http"
	"strconv"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/slug"
)

// ── Public recipe views ────────────────────────────────────────────────────────

type recipeIndexData struct {
	PageData
	Profile *models.User
	Recipes []*models.Recipe
	IsOwner bool
}

// RecipeIndex renders /u/{username}/recipes/.
func (a *App) RecipeIndex(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureRecipes {
		a.NotFound(w, r)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	recipes, err := models.ListRecipesByUser(a.DB, profile.ID, !isOwner)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}

	a.Tmpl.Render(w, http.StatusOK, "user/recipe_index", recipeIndexData{
		PageData: a.newPage(r, profile.DisplayOrUsername()+"'s Recipes"),
		Profile:  profile,
		Recipes:  recipes,
		IsOwner:  isOwner,
	})
}

type recipePostData struct {
	PageData
	Profile     *models.User
	Recipe      *models.Recipe
	DescHTML    template.HTML  // rendered description
	IsOwner     bool
	EditMode    bool
	Photos      []*models.Photo
}

// RecipePost renders /u/{username}/recipes/{slug}.
func (a *App) RecipePost(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	recipeSlug := r.PathValue("slug")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureRecipes {
		a.NotFound(w, r)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	recipe, err := models.GetRecipeBySlug(a.DB, profile.ID, recipeSlug)
	if err != nil || (!recipe.Published && !isOwner) {
		a.NotFound(w, r)
		return
	}
	editMode := isOwner && r.URL.Query().Get("edit") == "1"

	var photos []*models.Photo
	if isOwner {
		photos, _ = models.ListRecentPhotosByUser(a.DB, viewer.ID, 100)
	}

	a.Tmpl.Render(w, http.StatusOK, "user/recipe_post", recipePostData{
		PageData: a.newPage(r, recipe.Title),
		Profile:  profile,
		Recipe:   recipe,
		DescHTML: renderContent(recipe.Description),
		IsOwner:  isOwner,
		EditMode: editMode,
		Photos:   photos,
	})
}

// RecipePostInlineUpdate handles POST /u/{username}/recipes/{slug} — inline edit save.
func (a *App) RecipePostInlineUpdate(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	recipeSlug := r.PathValue("slug")
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
	recipe, err := models.GetRecipeBySlug(a.DB, profile.ID, recipeSlug)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	recipe.Title = strings.TrimSpace(r.FormValue("title"))
	recipe.Description = strings.TrimSpace(r.FormValue("description"))
	recipe.Ingredients = r.FormValue("ingredients")
	recipe.Steps = r.FormValue("steps")
	recipe.Published = r.FormValue("published") == "1"
	if newSlug := slug.Make(strings.TrimSpace(r.FormValue("slug"))); newSlug != "" && newSlug != recipe.Slug {
		recipe.Slug = makeUniqueSlug(a.DB, "recipes", profile.ID, recipe.ID, newSlug)
	}
	if err := models.UpdateRecipe(a.DB, recipe); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/u/"+username+"/recipes/"+recipe.Slug, http.StatusSeeOther)
}

// ── Dashboard recipe CRUD ──────────────────────────────────────────────────────

type dashRecipeData struct {
	PageData
	Recipes     []*models.Recipe
	Editing     *models.Recipe
	EditingDesc template.HTML  // editor-ready HTML for Editing.Description
	Photos      []*models.Photo
}

// DashboardRecipeList renders GET /dashboard/recipes/.
func (a *App) DashboardRecipeList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipes, err := models.ListRecipesByUser(a.DB, user.ID, false)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 100)
	pd := a.newPage(r, "My Recipes")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/recipes", dashRecipeData{PageData: pd, Recipes: recipes, Photos: photos})
}

// DashboardRecipeNew renders GET /dashboard/recipes/new.
func (a *App) DashboardRecipeNew(w http.ResponseWriter, r *http.Request) {
	a.Tmpl.Render(w, http.StatusOK, "dashboard/recipes", dashRecipeData{
		PageData: a.newPage(r, "New Recipe"),
	})
}

// DashboardRecipeCreate handles POST /dashboard/recipes/new.
func (a *App) DashboardRecipeCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	if title == "" {
		http.Redirect(w, r, "/dashboard/recipes/?flash=Title+is+required.", http.StatusSeeOther)
		return
	}

	s := makeUniqueSlug(a.DB, "recipes", user.ID, 0, slug.Make(title))
	_, err := models.CreateRecipe(a.DB, &models.Recipe{
		UserID:      user.ID,
		Title:       title,
		Slug:        s,
		Description: sanitizeContent(r.FormValue("description")),
		Ingredients: r.FormValue("ingredients"),
		Steps:       r.FormValue("steps"),
		Published:   r.FormValue("published") == "1",
	})
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/recipes/?flash=Recipe+created.", http.StatusSeeOther)
}

// DashboardRecipeEdit renders GET /dashboard/recipes/{id}/edit.
func (a *App) DashboardRecipeEdit(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 100)
	pd := a.newPage(r, "Edit Recipe")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/recipes", dashRecipeData{
		PageData:    pd,
		Editing:     recipe,
		EditingDesc: contentForEditor(recipe.Description),
		Photos:      photos,
	})
}

// DashboardRecipeUpdate handles POST /dashboard/recipes/{id}/edit.
func (a *App) DashboardRecipeUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	recipe.Title = strings.TrimSpace(r.FormValue("title"))
	recipe.Description = sanitizeContent(r.FormValue("description"))
	recipe.Ingredients = r.FormValue("ingredients")
	recipe.Steps = r.FormValue("steps")
	recipe.Published = r.FormValue("published") == "1"

	rawSlug := slug.Make(strings.TrimSpace(r.FormValue("slug")))
	if rawSlug == "" {
		rawSlug = slug.Make(recipe.Title)
	}
	recipe.Slug = makeUniqueSlug(a.DB, "recipes", user.ID, recipe.ID, rawSlug)

	if err := models.UpdateRecipe(a.DB, recipe); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/recipes/?flash=Recipe+updated.", http.StatusSeeOther)
}

// DashboardRecipeToggle handles POST /dashboard/recipes/{id}/toggle — flips published.
func (a *App) DashboardRecipeToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	if err := models.SetRecipePublished(a.DB, recipe.ID, !recipe.Published); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/recipes/?flash=Visibility+updated.", http.StatusSeeOther)
}

// DashboardRecipeDelete handles POST /dashboard/recipes/{id}/delete.
func (a *App) DashboardRecipeDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	if err := models.DeleteRecipe(a.DB, recipe.ID); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/recipes/?flash=Recipe+deleted.", http.StatusSeeOther)
}

// DashboardAttemptAdd handles POST /dashboard/recipes/{id}/attempt.
func (a *App) DashboardAttemptAdd(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	title := strings.TrimSpace(r.FormValue("title"))
	if title == "" {
		title = "Variation"
	}
	_, err := models.AddAttempt(a.DB, &models.Attempt{
		RecipeID: recipe.ID,
		UserID:   user.ID,
		Title:    title,
		Notes:    r.FormValue("notes"),
	})
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/recipes/?flash=Variation+logged.", http.StatusSeeOther)
}

// DashboardAttemptDelete handles POST /dashboard/recipes/{id}/attempt/{aid}/delete.
func (a *App) DashboardAttemptDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	aidStr := r.PathValue("aid")
	aid, err := strconv.ParseInt(aidStr, 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	// Verify the recipe is owned by the user.
	if _, ok := a.getOwnedRecipe(w, r, user); !ok {
		return
	}
	if err := models.DeleteAttempt(a.DB, aid); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/recipes/?flash=Variation+deleted.", http.StatusSeeOther)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func (a *App) getOwnedRecipe(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Recipe, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return nil, false
	}
	recipe, err := models.GetRecipeByID(a.DB, id)
	if err != nil || (recipe.UserID != user.ID && !user.IsAdmin()) {
		a.NotFound(w, r)
		return nil, false
	}
	return recipe, true
}
