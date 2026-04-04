package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// BlogIndex handles GET /api/v1/u/{username}/blog — list published posts.
// The owner also sees drafts.
func (a *App) BlogIndex(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureBlog {
		a.respondError(w, http.StatusNotFound, "blog not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	posts, err := models.ListPostsByUser(a.DB, profile.ID, !isOwner)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"posts":    toPostList(posts),
		"is_owner": isOwner,
	})
}

// BlogPost handles GET /api/v1/u/{username}/blog/{slug} — single post with rendered body.
func (a *App) BlogPost(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	postSlug := r.PathValue("slug")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureBlog {
		a.respondError(w, http.StatusNotFound, "blog not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	post, err := models.GetPostBySlug(a.DB, profile.ID, postSlug)
	if err != nil || (!post.Published && !isOwner) {
		a.respondError(w, http.StatusNotFound, "post not found")
		return
	}

	a.respondJSON(w, http.StatusOK, map[string]any{
		"post":     toPostJSON(post),
		"is_owner": isOwner,
	})
}
