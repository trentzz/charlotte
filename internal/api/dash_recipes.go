package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/slug"
	"github.com/trentzz/charlotte/internal/storage"
)

// DashRecipeList handles GET /api/v1/dashboard/recipes — list all recipes including drafts.
func (a *App) DashRecipeList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipes, err := models.ListRecipesByUser(a.DB, user.ID, false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toRecipeList(recipes))
}

// DashRecipeCreate handles POST /api/v1/dashboard/recipes — create a new recipe.
func (a *App) DashRecipeCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		Title             string                     `json:"title"`
		Description       string                     `json:"description"`
		Ingredients       json.RawMessage            `json:"ingredients"`
		Steps             json.RawMessage            `json:"steps"`
		IngredientsGroups []models.IngredientGroup   `json:"ingredients_groups"`
		MethodGroups      []models.MethodGroup       `json:"method_groups"`
		Variations        []models.Variation         `json:"variations"`
		Published         bool                       `json:"published"`
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

	s := makeUniqueSlug(a.DB, "recipes", user.ID, 0, slug.Make(title))
	id, err := models.CreateRecipe(a.DB, &models.Recipe{
		UserID:            user.ID,
		Title:             title,
		Slug:              s,
		Description:       sanitizeContent(body.Description),
		Ingredients:       parseStringOrArray(body.Ingredients),
		Steps:             parseStringOrArray(body.Steps),
		IngredientsGroups: body.IngredientsGroups,
		MethodGroups:      body.MethodGroups,
		Variations:        body.Variations,
		Published:         body.Published,
	})
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	recipe, err := models.GetRecipeByID(a.DB, id)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusCreated, toRecipeJSON(recipe))
}

// DashRecipeGet handles GET /api/v1/dashboard/recipes/{id} — single recipe with attempts.
func (a *App) DashRecipeGet(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	a.respondJSON(w, http.StatusOK, toRecipeJSON(recipe))
}

// DashRecipeUpdate handles PUT /api/v1/dashboard/recipes/{id} — update a recipe.
func (a *App) DashRecipeUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}

	var body struct {
		Title             string                   `json:"title"`
		Description       string                   `json:"description"`
		Ingredients       json.RawMessage          `json:"ingredients"`
		Steps             json.RawMessage          `json:"steps"`
		IngredientsGroups []models.IngredientGroup `json:"ingredients_groups"`
		MethodGroups      []models.MethodGroup     `json:"method_groups"`
		Variations        []models.Variation       `json:"variations"`
		Published         bool                     `json:"published"`
		Slug              string                   `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	recipe.Title = strings.TrimSpace(body.Title)
	if recipe.Title == "" {
		a.respondError(w, http.StatusBadRequest, "title is required")
		return
	}
	recipe.Description = sanitizeContent(body.Description)
	recipe.Ingredients = parseStringOrArray(body.Ingredients)
	recipe.Steps = parseStringOrArray(body.Steps)
	recipe.IngredientsGroups = body.IngredientsGroups
	recipe.MethodGroups = body.MethodGroups
	recipe.Variations = body.Variations
	recipe.Published = body.Published

	rawSlug := slug.Make(strings.TrimSpace(body.Slug))
	if rawSlug == "" {
		rawSlug = slug.Make(recipe.Title)
	}
	recipe.Slug = makeUniqueSlug(a.DB, "recipes", user.ID, recipe.ID, rawSlug)

	if err := models.UpdateRecipe(a.DB, recipe); err != nil {
		a.internalError(w, r, err)
		return
	}

	// Re-fetch so updated_at and any DB-side changes are reflected in the response.
	updated, err := models.GetRecipeByID(a.DB, recipe.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toRecipeJSON(updated))
}

// DashRecipeToggle handles PATCH /api/v1/dashboard/recipes/{id}/toggle — flip published.
func (a *App) DashRecipeToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	if err := models.SetRecipePublished(a.DB, recipe.ID, !recipe.Published); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"published": !recipe.Published})
}

// DashRecipeDelete handles DELETE /api/v1/dashboard/recipes/{id}.
func (a *App) DashRecipeDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	if err := models.DeleteRecipe(a.DB, recipe.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "recipe deleted"})
}

// DashAttemptAdd handles POST /api/v1/dashboard/recipes/{id}/attempts — add an attempt.
func (a *App) DashAttemptAdd(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}

	var body struct {
		Title string `json:"title"`
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	title := strings.TrimSpace(body.Title)
	if title == "" {
		title = "Variation"
	}
	id, err := models.AddAttempt(a.DB, &models.Attempt{
		RecipeID: recipe.ID,
		UserID:   user.ID,
		Title:    title,
		Notes:    body.Notes,
	})
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

// DashAttemptDelete handles DELETE /api/v1/dashboard/recipes/{id}/attempts/{aid}.
func (a *App) DashAttemptDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	// Verify the recipe is owned by the user.
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}
	aid, err := strconv.ParseInt(r.PathValue("aid"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "attempt not found")
		return
	}
	// Pass recipeID so the DELETE only succeeds if the attempt belongs to this recipe.
	if err := models.DeleteAttempt(a.DB, aid, recipe.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "attempt deleted"})
}

// DashRecipePhotoUpload handles POST /api/v1/dashboard/recipes/{id}/photos — multipart upload.
// Form fields: photos[] (files), caption (optional string).
func (a *App) DashRecipePhotoUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}

	if err := r.ParseMultipartForm(20*storage.MaxUploadBytes + (1 << 20)); err != nil {
		a.respondError(w, http.StatusBadRequest, "bad request")
		return
	}

	files := r.MultipartForm.File["photos"]
	if len(files) == 0 {
		a.respondError(w, http.StatusBadRequest, "no files selected")
		return
	}

	caption := strings.TrimSpace(r.FormValue("caption"))
	var uploaded []recipePhotoJSON
	failed := 0
	for _, fhdr := range files {
		result, err := storage.SaveUpload(a.DataDir, user.ID, fhdr)
		if err != nil {
			failed++
			continue
		}
		photoID, err := models.AddRecipePhoto(a.DB, &models.RecipePhoto{
			RecipeID: recipe.ID,
			UserID:   user.ID,
			Path:     result.Filename,
			Caption:  caption,
		})
		if err != nil {
			_ = storage.DeleteUpload(a.DataDir, user.ID, result.Filename)
			failed++
			continue
		}
		if p, err := models.GetRecipePhoto(a.DB, photoID); err == nil {
			uploaded = append(uploaded, toRecipePhotoJSON(p))
		}
	}

	if uploaded == nil {
		uploaded = []recipePhotoJSON{}
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"uploaded": uploaded,
		"failed":   failed,
		"message":  fmt.Sprintf("%d uploaded, %d failed", len(uploaded), failed),
	})
}

// DashRecipePhotoDelete handles DELETE /api/v1/dashboard/recipes/{id}/photos/{photoID}.
func (a *App) DashRecipePhotoDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if _, ok := a.getOwnedRecipe(w, r, user); !ok {
		return
	}

	photoID, err := strconv.ParseInt(r.PathValue("photoID"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}

	photo, err := models.GetRecipePhoto(a.DB, photoID)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}

	if err := models.DeleteRecipePhoto(a.DB, photoID, user.ID); err != nil {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}
	_ = storage.DeleteUpload(a.DataDir, photo.UserID, photo.Path)
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "photo deleted"})
}

// DashRecipeTheme handles PATCH /api/v1/dashboard/recipes/{id}/theme.
func (a *App) DashRecipeTheme(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	recipe, ok := a.getOwnedRecipe(w, r, user)
	if !ok {
		return
	}

	var body struct {
		Enabled bool             `json:"enabled"`
		Theme   models.UserTheme `json:"theme"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	theme, err := validateAndClampTheme(body.Theme)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := models.UpdateContentTheme(a.DB, "recipes", recipe.ID, theme, body.Enabled); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"enabled": body.Enabled, "theme": theme})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (a *App) getOwnedRecipe(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Recipe, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "recipe not found")
		return nil, false
	}
	recipe, err := models.GetRecipeByID(a.DB, id)
	if err != nil || (recipe.UserID != user.ID && !user.IsAdmin()) {
		a.respondError(w, http.StatusNotFound, "recipe not found")
		return nil, false
	}
	return recipe, true
}
