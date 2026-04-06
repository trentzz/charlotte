package api

import (
	"fmt"
	"log"
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// UserProfile handles GET /api/v1/u/{username} — returns profile + recent content.
func (a *App) UserProfile(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	out := map[string]any{
		"profile": toUserJSON(profile),
	}

	if profile.FeatureBlog {
		posts, err := models.ListPostsByUser(a.DB, profile.ID, !isOwner)
		if err != nil {
			log.Printf("profile: list posts for user %d: %v", profile.ID, err)
			posts = nil
		}
		out["recent_posts"] = toPostList(posts)
	} else {
		out["recent_posts"] = []any{}
	}

	if profile.FeatureGallery {
		photos, err := models.ListRecentPhotosByUser(a.DB, profile.ID, 50)
		if err != nil {
			log.Printf("profile: list photos for user %d: %v", profile.ID, err)
			photos = nil
		}
		out["recent_photos"] = toPhotoList(photos)
		// Use all albums (not just top-level) so sub-albums pinned as homepage widgets can be matched.
		albums, err := models.ListAlbumsByUser(a.DB, profile.ID, true)
		if err != nil {
			log.Printf("profile: list albums for user %d: %v", profile.ID, err)
			albums = nil
		}
		out["albums"] = toAlbumList(albums)
	} else {
		out["recent_photos"] = []any{}
		out["albums"] = []any{}
	}

	if profile.FeatureRecipes {
		recipes, err := models.ListRecipesByUser(a.DB, profile.ID, !isOwner)
		if err != nil {
			log.Printf("profile: list recipes for user %d: %v", profile.ID, err)
			recipes = nil
		}
		out["recent_recipes"] = toRecipeList(recipes)
	} else {
		out["recent_recipes"] = []any{}
	}

	if profile.FeatureProjects {
		projs, err := models.ListProjectsByUser(a.DB, profile.ID, !isOwner)
		if err != nil {
			log.Printf("profile: list projects for user %d: %v", profile.ID, err)
			projs = nil
		}
		out["recent_projects"] = toProjectList(projs)
	} else {
		out["recent_projects"] = []any{}
	}

	layout, err := models.GetHomepageLayout(a.DB, profile.ID)
	if err != nil {
		log.Printf("profile: get homepage layout for user %d: %v", profile.ID, err)
		layout = nil
	}
	out["homepage"] = layout

	pages, err := models.ListCustomPagesByUser(a.DB, profile.ID, !isOwner)
	if err != nil {
		log.Printf("profile: list custom pages for user %d: %v", profile.ID, err)
		pages = nil
	}
	out["custom_pages"] = toCustomPageList(pages)
	out["custom_nav"] = map[string]any{
		"mode":  profile.CustomNavMode,
		"label": profile.CustomNavGroupLabel,
	}
	navCfg := profile.NavConfig
	if navCfg == "" {
		navCfg = "{}"
	}
	out["nav_config"] = navCfg

	a.respondJSON(w, http.StatusOK, out)
}

// ── JSON conversion helpers ───────────────────────────────────────────────────

type postJSON struct {
	ID        int64    `json:"id"`
	Title     string   `json:"title"`
	Slug      string   `json:"slug"`
	Body      string   `json:"body"`
	BodyHTML  string   `json:"body_html"`
	Published bool     `json:"published"`
	Tags      []string `json:"tags"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
}

func toPostJSON(p *models.Post) postJSON {
	tags := p.Tags
	if tags == nil {
		tags = []string{}
	}
	return postJSON{
		ID:        p.ID,
		Title:     p.Title,
		Slug:      p.Slug,
		Body:      p.Body,
		BodyHTML:  renderContent(p.Body),
		Published: p.Published,
		Tags:      tags,
		CreatedAt: p.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt: p.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func toPostList(posts []*models.Post) []postJSON {
	out := make([]postJSON, 0, len(posts))
	for _, p := range posts {
		out = append(out, toPostJSON(p))
	}
	return out
}

type photoJSON struct {
	ID            int64  `json:"id"`
	AlbumID       int64  `json:"album_id"`
	URL           string `json:"url"`
	CompressedURL string `json:"compressed_url"`
	Caption       string `json:"caption"`
	MIMEType      string `json:"mime_type"`
	Width         int    `json:"width"`
	Height        int    `json:"height"`
	CreatedAt     string `json:"created_at"`
	Version       int64  `json:"version"`
}

func toPhotoJSON(p *models.Photo) photoJSON {
	var compressedURL string
	if p.CompressedFilename != "" {
		compressedURL = fmt.Sprintf("/uploads/%d/%s", p.UserID, p.CompressedFilename)
	}
	return photoJSON{
		ID:            p.ID,
		AlbumID:       p.AlbumID,
		URL:           photoURL(p.UserID, p.Filename),
		CompressedURL: compressedURL,
		Caption:       p.Caption,
		MIMEType:      p.MIMEType,
		Width:         p.Width,
		Height:        p.Height,
		CreatedAt:     p.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		Version:       p.Version,
	}
}

func toPhotoList(photos []*models.Photo) []photoJSON {
	out := make([]photoJSON, 0, len(photos))
	for _, p := range photos {
		out = append(out, toPhotoJSON(p))
	}
	return out
}

type ingredientGroupJSON struct {
	Title string   `json:"title"`
	Items []string `json:"items"`
}

type methodStepJSON struct {
	Text         string `json:"text"`
	TimerSeconds int    `json:"timer_seconds,omitempty"`
}

type methodGroupJSON struct {
	Title        string           `json:"title"`
	TimerSeconds int              `json:"timer_seconds,omitempty"`
	Steps        []methodStepJSON `json:"steps"`
}

type variationJSON struct {
	Title          string `json:"title"`
	Notes          string `json:"notes"`
	FromIngredient int    `json:"from_ingredient,omitempty"`
	FromStep       int    `json:"from_step,omitempty"`
}

type recipePhotoJSON struct {
	ID        int64  `json:"id"`
	RecipeID  int64  `json:"recipe_id"`
	URL       string `json:"url"`
	Caption   string `json:"caption"`
	SortOrder int    `json:"sort_order"`
	CreatedAt string `json:"created_at"`
}

func toRecipePhotoJSON(p *models.RecipePhoto) recipePhotoJSON {
	return recipePhotoJSON{
		ID:        p.ID,
		RecipeID:  p.RecipeID,
		URL:       photoURL(p.UserID, p.Path),
		Caption:   p.Caption,
		SortOrder: p.SortOrder,
		CreatedAt: p.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

type recipeJSON struct {
	ID                int64                `json:"id"`
	Title             string               `json:"title"`
	Slug              string               `json:"slug"`
	Description       string               `json:"description"`
	Ingredients       string               `json:"ingredients"`
	Steps             string               `json:"steps"`
	IngredientsGroups []ingredientGroupJSON `json:"ingredients_groups"`
	MethodGroups      []methodGroupJSON     `json:"method_groups"`
	Variations        []variationJSON       `json:"variations"`
	Published         bool                 `json:"published"`
	Attempts          []attemptJSON        `json:"attempts"`
	Photos            []recipePhotoJSON    `json:"photos"`
	CreatedAt         string               `json:"created_at"`
	UpdatedAt         string               `json:"updated_at"`
}

type attemptJSON struct {
	ID        int64  `json:"id"`
	RecipeID  int64  `json:"recipe_id"`
	Title     string `json:"title"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"created_at"`
}

func toRecipeJSON(r *models.Recipe) recipeJSON {
	attempts := make([]attemptJSON, 0, len(r.Attempts))
	for _, a := range r.Attempts {
		attempts = append(attempts, attemptJSON{
			ID:        a.ID,
			RecipeID:  a.RecipeID,
			Title:     a.Title,
			Notes:     a.Notes,
			CreatedAt: a.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}

	ingGroups := make([]ingredientGroupJSON, 0, len(r.IngredientsGroups))
	for _, g := range r.IngredientsGroups {
		items := g.Items
		if items == nil {
			items = []string{}
		}
		ingGroups = append(ingGroups, ingredientGroupJSON{Title: g.Title, Items: items})
	}

	methGroups := make([]methodGroupJSON, 0, len(r.MethodGroups))
	for _, g := range r.MethodGroups {
		stepJSONs := make([]methodStepJSON, 0, len(g.Steps))
		for _, s := range g.Steps {
			stepJSONs = append(stepJSONs, methodStepJSON{Text: s.Text, TimerSeconds: s.TimerSeconds})
		}
		if stepJSONs == nil {
			stepJSONs = []methodStepJSON{}
		}
		methGroups = append(methGroups, methodGroupJSON{Title: g.Title, TimerSeconds: g.TimerSeconds, Steps: stepJSONs})
	}

	variations := make([]variationJSON, 0, len(r.Variations))
	for _, v := range r.Variations {
		variations = append(variations, variationJSON{
			Title:          v.Title,
			Notes:          v.Notes,
			FromIngredient: v.FromIngredient,
			FromStep:       v.FromStep,
		})
	}

	photos := make([]recipePhotoJSON, 0, len(r.Photos))
	for _, p := range r.Photos {
		photos = append(photos, toRecipePhotoJSON(p))
	}

	return recipeJSON{
		ID:                r.ID,
		Title:             r.Title,
		Slug:              r.Slug,
		Description:       r.Description,
		Ingredients:       r.Ingredients,
		Steps:             r.Steps,
		IngredientsGroups: ingGroups,
		MethodGroups:      methGroups,
		Variations:        variations,
		Published:         r.Published,
		Attempts:          attempts,
		Photos:            photos,
		CreatedAt:         r.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:         r.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func toRecipeList(recipes []*models.Recipe) []recipeJSON {
	out := make([]recipeJSON, 0, len(recipes))
	for _, r := range recipes {
		out = append(out, toRecipeJSON(r))
	}
	return out
}

type projectJSON struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	Slug         string     `json:"slug"`
	Description  string     `json:"description"`
	URL          string     `json:"url"`
	ImageURL     string     `json:"image_url"`
	Body         string     `json:"body"`
	BodyHTML     string     `json:"body_html"`
	LinkedPosts  []postJSON `json:"linked_posts"`
	Published    bool       `json:"published"`
	DisplayOrder int        `json:"display_order"`
	CreatedAt    string     `json:"created_at"`
	UpdatedAt    string     `json:"updated_at"`
}

func toProjectJSON(p *models.Project) projectJSON {
	imageURL := ""
	if p.ImagePath != "" {
		imageURL = photoURL(p.UserID, p.ImagePath)
	}
	linked := make([]postJSON, 0, len(p.LinkedPosts))
	for _, post := range p.LinkedPosts {
		linked = append(linked, toPostJSON(post))
	}
	return projectJSON{
		ID:           p.ID,
		Title:        p.Title,
		Slug:         p.Slug,
		Description:  p.Description,
		URL:          p.URL,
		ImageURL:     imageURL,
		Body:         p.Body,
		BodyHTML:     renderContent(p.Body),
		LinkedPosts:  linked,
		Published:    p.Published,
		DisplayOrder: p.DisplayOrder,
		CreatedAt:    p.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    p.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func toProjectList(projects []*models.Project) []projectJSON {
	out := make([]projectJSON, 0, len(projects))
	for _, p := range projects {
		out = append(out, toProjectJSON(p))
	}
	return out
}

type albumJSON struct {
	ID               int64       `json:"id"`
	ParentID         *int64      `json:"parent_id,omitempty"`
	Title            string      `json:"title"`
	Slug             string      `json:"slug"`
	Description      string      `json:"description"`
	Published        bool        `json:"published"`
	IsDefault        bool        `json:"is_default"`
	DefaultChildID   *int64      `json:"default_child_id,omitempty"`
	DefaultChildSlug string      `json:"default_child_slug,omitempty"`
	CoverPhoto       *photoJSON  `json:"cover_photo"`
	CoverURL         string      `json:"cover_url"` // explicit cover URL, or first photo URL as fallback
	PhotoCount       int         `json:"photo_count"`
	SubAlbums        []albumJSON `json:"sub_albums,omitempty"`
	CreatedAt        string      `json:"created_at"`
	UpdatedAt        string      `json:"updated_at"`
}

func toAlbumJSON(a *models.Album) albumJSON {
	var cover *photoJSON
	var coverURL string
	if a.CoverPhoto != nil {
		c := toPhotoJSON(a.CoverPhoto)
		cover = &c
		coverURL = c.URL
	} else if a.FirstPhoto != nil {
		coverURL = photoURL(a.FirstPhoto.UserID, a.FirstPhoto.Filename)
	}
	aj := albumJSON{
		ID:             a.ID,
		ParentID:       a.ParentID,
		Title:          a.Title,
		Slug:           a.Slug,
		Description:    a.Description,
		Published:      a.Published,
		IsDefault:      a.IsDefault,
		DefaultChildID: a.DefaultChildID,
		CoverPhoto:     cover,
		CoverURL:       coverURL,
		PhotoCount:     a.PhotoCount,
		CreatedAt:      a.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:      a.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
	// Resolve the default child slug from the sub-albums list if available.
	if a.DefaultChildID != nil {
		for _, sub := range a.SubAlbums {
			if sub.ID == *a.DefaultChildID {
				aj.DefaultChildSlug = sub.Slug
				break
			}
		}
	}
	if len(a.SubAlbums) > 0 {
		aj.SubAlbums = toAlbumList(a.SubAlbums)
	}
	return aj
}

func toAlbumList(albums []*models.Album) []albumJSON {
	out := make([]albumJSON, 0, len(albums))
	for _, a := range albums {
		out = append(out, toAlbumJSON(a))
	}
	return out
}
