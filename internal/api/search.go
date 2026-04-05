package api

import (
	"net/http"
	"strings"

	"github.com/trentzz/charlotte/internal/models"
)

// SearchResult is a single item returned by the search API.
type SearchResult struct {
	Type        string `json:"type"`        // "blog", "project", "recipe", "album"
	Title       string `json:"title"`
	Slug        string `json:"slug"`
	Description string `json:"description"` // excerpt or description
}

// PublicSearch returns content matching the query string for a user's public site.
func (a *App) PublicSearch(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" || len(q) < 2 {
		a.respondJSON(w, http.StatusOK, map[string]any{"results": []any{}})
		return
	}

	user, err := models.GetUserByUsername(a.DB, username)
	if err != nil || user == nil {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}

	var results []SearchResult

	// Blog posts
	posts, err := models.SearchPostsByUser(a.DB, user.ID, q)
	if err == nil {
		for _, p := range posts {
			results = append(results, SearchResult{
				Type:        "blog",
				Title:       p.Title,
				Slug:        p.Slug,
				Description: truncate(p.Body, 120),
			})
		}
	}

	// Projects
	projects, err := models.SearchProjectsByUser(a.DB, user.ID, q)
	if err == nil {
		for _, p := range projects {
			results = append(results, SearchResult{
				Type:        "project",
				Title:       p.Title,
				Slug:        p.Slug,
				Description: truncate(p.Description, 120),
			})
		}
	}

	// Recipes
	recipes, err := models.SearchRecipesByUser(a.DB, user.ID, q)
	if err == nil {
		for _, r := range recipes {
			results = append(results, SearchResult{
				Type:        "recipe",
				Title:       r.Title,
				Slug:        r.Slug,
				Description: truncate(r.Description, 120),
			})
		}
	}

	// Albums (top-level only)
	albums, err := models.SearchAlbumsByUser(a.DB, user.ID, q)
	if err == nil {
		for _, al := range albums {
			results = append(results, SearchResult{
				Type:        "album",
				Title:       al.Title,
				Slug:        al.Slug,
				Description: truncate(al.Description, 120),
			})
		}
	}

	if results == nil {
		results = []SearchResult{}
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"results": results})
}

// truncate shortens s to at most max bytes, appending an ellipsis when cut.
func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "\u2026"
}
