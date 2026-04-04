package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/slug"
	"github.com/trentzz/charlotte/internal/storage"
)

// DashBlogList handles GET /api/v1/dashboard/blog — list all user's posts including drafts.
func (a *App) DashBlogList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	posts, err := models.ListPostsByUser(a.DB, user.ID, false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toPostList(posts))
}

// DashBlogCreate handles POST /api/v1/dashboard/blog — create a new post.
func (a *App) DashBlogCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		Title     string   `json:"title"`
		Body      string   `json:"body"`
		Slug      string   `json:"slug"`
		Published bool     `json:"published"`
		Tags      []string `json:"tags"`
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

	rawSlug := strings.TrimSpace(body.Slug)
	if rawSlug == "" {
		rawSlug = slug.Make(title)
	} else {
		rawSlug = slug.Make(rawSlug)
	}
	rawSlug = makeUniqueSlug(a.DB, "blog_posts", user.ID, 0, rawSlug)

	content := sanitizeContent(body.Body)
	tags := body.Tags
	if tags == nil {
		tags = []string{}
	}

	id, err := models.CreatePost(a.DB, &models.Post{
		UserID:    user.ID,
		Title:     title,
		Slug:      rawSlug,
		Body:      content,
		Published: body.Published,
		Tags:      tags,
	})
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	post, err := models.GetPostByID(a.DB, id)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusCreated, toPostJSON(post))
}

// DashBlogGet handles GET /api/v1/dashboard/blog/{id} — single post the user owns.
func (a *App) DashBlogGet(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	a.respondJSON(w, http.StatusOK, toPostJSON(post))
}

// DashBlogUpdate handles PUT /api/v1/dashboard/blog/{id} — update a post.
func (a *App) DashBlogUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}

	var body struct {
		Title     string   `json:"title"`
		Body      string   `json:"body"`
		Slug      string   `json:"slug"`
		Published bool     `json:"published"`
		Tags      []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	post.Title = strings.TrimSpace(body.Title)
	if post.Title == "" {
		a.respondError(w, http.StatusBadRequest, "title is required")
		return
	}
	post.Body = sanitizeContent(body.Body)
	post.Published = body.Published

	rawSlug := slug.Make(strings.TrimSpace(body.Slug))
	if rawSlug == "" {
		rawSlug = slug.Make(post.Title)
	}
	post.Slug = makeUniqueSlug(a.DB, "blog_posts", user.ID, post.ID, rawSlug)

	post.Tags = body.Tags
	if post.Tags == nil {
		post.Tags = []string{}
	}

	if err := models.UpdatePost(a.DB, post); err != nil {
		a.internalError(w, r, err)
		return
	}

	// Re-fetch so updated_at and any DB-side changes are reflected in the response.
	updated, err := models.GetPostByID(a.DB, post.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, toPostJSON(updated))
}

// DashBlogToggle handles PATCH /api/v1/dashboard/blog/{id}/toggle — flip published.
func (a *App) DashBlogToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	if err := models.SetPostPublished(a.DB, post.ID, !post.Published); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"published": !post.Published})
}

// DashBlogDelete handles DELETE /api/v1/dashboard/blog/{id}.
func (a *App) DashBlogDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	if err := models.DeletePost(a.DB, post.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "post deleted"})
}

// DashBlogImageUpload handles POST /api/v1/dashboard/blog/image — upload a blog image.
// Returns {"url": "/uploads/..."} for EasyMDE compatibility.
func (a *App) DashBlogImageUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseMultipartForm(storage.MaxUploadBytes + (1 << 20)); err != nil {
		a.respondError(w, http.StatusBadRequest, "bad request")
		return
	}
	files := r.MultipartForm.File["image"]
	if len(files) == 0 {
		a.respondError(w, http.StatusBadRequest, "no file provided")
		return
	}
	result, err := storage.SaveUpload(a.DataDir, user.ID, files[0])
	if err != nil {
		a.respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	// Record in the default upload album so it shows in the gallery.
	album, err := models.GetDefaultAlbum(a.DB, user.ID)
	if err == nil {
		photoID, _ := models.CreatePhoto(a.DB, &models.Photo{
			UserID:    user.ID,
			AlbumID:   album.ID,
			Filename:  result.Filename,
			MIMEType:  result.MIMEType,
			SizeBytes: result.SizeBytes,
			Width:     result.Width,
			Height:    result.Height,
		})
		_ = models.AddPhotoToAlbum(a.DB, album.ID, photoID)
		_ = models.SetAlbumCoverIfNone(a.DB, album.ID, photoID)
	}
	a.respondJSON(w, http.StatusOK, map[string]string{
		"url": "/uploads/" + strconv.FormatInt(user.ID, 10) + "/" + result.Filename,
	})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (a *App) getOwnedPost(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Post, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "post not found")
		return nil, false
	}
	post, err := models.GetPostByID(a.DB, id)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "post not found")
		return nil, false
	}
	if post.UserID != user.ID && !user.IsAdmin() {
		a.respondError(w, http.StatusForbidden, "forbidden")
		return nil, false
	}
	return post, true
}
