package handlers

import (
	"encoding/json"
	"html/template"
	"net/http"
	"strconv"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/slug"
	"github.com/trentzz/charlotte/internal/storage"
)

// ── Public blog views ──────────────────────────────────────────────────────────

type blogIndexData struct {
	PageData
	Profile *models.User
	Posts   []*models.Post
	IsOwner bool
}

// BlogIndex renders /u/{username}/blog/.
func (a *App) BlogIndex(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureBlog {
		a.NotFound(w, r)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	posts, err := models.ListPostsByUser(a.DB, profile.ID, !isOwner)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}

	a.Tmpl.Render(w, http.StatusOK, "user/blog_index", blogIndexData{
		PageData: a.newPage(r, profile.DisplayOrUsername()+"'s Blog"),
		Profile:  profile,
		Posts:    posts,
		IsOwner:  isOwner,
	})
}

type blogPostData struct {
	PageData
	Profile        *models.User
	Post           *models.Post
	BodyHTML       template.HTML // rendered for display
	BodyForEditor  template.HTML // HTML loaded into WYSIWYG editor
	IsOwner        bool
	EditMode       bool
	Photos         []*models.Photo // gallery photos for image picker
}

// BlogPost renders /u/{username}/blog/{slug}.
func (a *App) BlogPost(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	postSlug := r.PathValue("slug")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureBlog {
		a.NotFound(w, r)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	post, err := models.GetPostBySlug(a.DB, profile.ID, postSlug)
	if err != nil || (!post.Published && !isOwner) {
		a.NotFound(w, r)
		return
	}
	editMode := isOwner && r.URL.Query().Get("edit") == "1"

	var photos []*models.Photo
	if isOwner {
		photos, _ = models.ListRecentPhotosByUser(a.DB, viewer.ID, 100)
	}

	a.Tmpl.Render(w, http.StatusOK, "user/blog_post", blogPostData{
		PageData:       a.newPage(r, post.Title),
		Profile:        profile,
		Post:           post,
		BodyHTML:       renderContent(post.Body),
		BodyForEditor:  contentForEditor(post.Body),
		IsOwner:        isOwner,
		EditMode:       editMode,
		Photos:         photos,
	})
}

// BlogPostInlineUpdate handles POST /u/{username}/blog/{slug} — inline edit save.
func (a *App) BlogPostInlineUpdate(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	postSlug := r.PathValue("slug")
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
	post, err := models.GetPostBySlug(a.DB, profile.ID, postSlug)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	post.Title = strings.TrimSpace(r.FormValue("title"))
	post.Body = sanitizeContent(r.FormValue("body"))
	post.Tags = parseTags(r.FormValue("tags"))
	post.Published = r.FormValue("published") == "1"
	if newSlug := slug.Make(strings.TrimSpace(r.FormValue("slug"))); newSlug != "" && newSlug != post.Slug {
		post.Slug = makeUniqueSlug(a.DB, "blog_posts", profile.ID, post.ID, newSlug)
	}
	if err := models.UpdatePost(a.DB, post); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/u/"+username+"/blog/"+post.Slug, http.StatusSeeOther)
}

// BlogImageUpload handles POST /dashboard/blog/image — uploads an image for use
// in a blog post and returns JSON {"data": {"filePath": "..."}}.
// EasyMDE calls this via its imageUploadFunction callback.
func (a *App) BlogImageUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseMultipartForm(storage.MaxUploadBytes + (1 << 20)); err != nil {
		jsonError(w, "bad request", http.StatusBadRequest)
		return
	}
	files := r.MultipartForm.File["image"]
	if len(files) == 0 {
		jsonError(w, "no file provided", http.StatusBadRequest)
		return
	}
	result, err := storage.SaveUpload(a.DataDir, user.ID, files[0])
	if err != nil {
		jsonError(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	// Record the photo in the general album so it shows in the gallery too.
	album, err := models.GetOrCreateGeneralAlbum(a.DB, user.ID)
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
		_ = models.SetAlbumCoverIfNone(a.DB, album.ID, photoID)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data": map[string]string{
			"filePath": "/uploads/" + strconv.FormatInt(user.ID, 10) + "/" + result.Filename,
		},
	})
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// ── Dashboard blog CRUD ────────────────────────────────────────────────────────

type dashBlogData struct {
	PageData
	Posts         []*models.Post
	Editing       *models.Post   // non-nil when in edit mode
	EditingHTML   template.HTML  // editor-ready HTML for Editing.Body
	Photos        []*models.Photo
}

// DashboardBlogList renders GET /dashboard/blog/.
func (a *App) DashboardBlogList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	posts, err := models.ListPostsByUser(a.DB, user.ID, false)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 100)
	pd := a.newPage(r, "My Blog")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/blog", dashBlogData{PageData: pd, Posts: posts, Photos: photos})
}

type dashBlogEditData struct {
	PageData
	Post *models.Post
}

// DashboardBlogNew renders GET /dashboard/blog/new.
func (a *App) DashboardBlogNew(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	posts, err := models.ListPostsByUser(a.DB, user.ID, false)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 100)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/blog", dashBlogData{
		PageData: a.newPage(r, "New Post"),
		Posts:    posts,
		Photos:   photos,
	})
}

// DashboardBlogCreate handles POST /dashboard/blog/new.
func (a *App) DashboardBlogCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	body := sanitizeContent(r.FormValue("body"))
	rawSlug := strings.TrimSpace(r.FormValue("slug"))
	published := r.FormValue("published") == "1"
	tags := parseTags(r.FormValue("tags"))

	if title == "" {
		http.Redirect(w, r, "/dashboard/blog/?flash=Title+is+required.", http.StatusSeeOther)
		return
	}
	if rawSlug == "" {
		rawSlug = slug.Make(title)
	} else {
		rawSlug = slug.Make(rawSlug)
	}
	rawSlug = makeUniqueSlug(a.DB, "blog_posts", user.ID, 0, rawSlug)

	_, err := models.CreatePost(a.DB, &models.Post{
		UserID:    user.ID,
		Title:     title,
		Slug:      rawSlug,
		Body:      body,
		Published: published,
		Tags:      tags,
	})
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/blog/?flash=Post+created.", http.StatusSeeOther)
}

// DashboardBlogEdit renders GET /dashboard/blog/{id}/edit.
func (a *App) DashboardBlogEdit(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	photos, _ := models.ListRecentPhotosByUser(a.DB, user.ID, 100)
	pd := a.newPage(r, "Edit: "+post.Title)
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/blog", dashBlogData{
		PageData:    pd,
		Editing:     post,
		EditingHTML: contentForEditor(post.Body),
		Photos:      photos,
	})
}

// DashboardBlogUpdate handles POST /dashboard/blog/{id}/edit.
func (a *App) DashboardBlogUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	post.Title = strings.TrimSpace(r.FormValue("title"))
	post.Body = sanitizeContent(r.FormValue("body"))
	rawSlug := slug.Make(strings.TrimSpace(r.FormValue("slug")))
	if rawSlug == "" {
		rawSlug = slug.Make(post.Title)
	}
	post.Slug = makeUniqueSlug(a.DB, "blog_posts", user.ID, post.ID, rawSlug)
	post.Published = r.FormValue("published") == "1"
	post.Tags = parseTags(r.FormValue("tags"))

	if err := models.UpdatePost(a.DB, post); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/blog/?flash=Post+updated.", http.StatusSeeOther)
}

// DashboardBlogToggle handles POST /dashboard/blog/{id}/toggle — flips published.
func (a *App) DashboardBlogToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	if err := models.SetPostPublished(a.DB, post.ID, !post.Published); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/blog/?flash=Visibility+updated.", http.StatusSeeOther)
}

// DashboardBlogDelete handles POST /dashboard/blog/{id}/delete.
func (a *App) DashboardBlogDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	post, ok := a.getOwnedPost(w, r, user)
	if !ok {
		return
	}
	if err := models.DeletePost(a.DB, post.ID); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/blog/?flash=Post+deleted.", http.StatusSeeOther)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func (a *App) getOwnedPost(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Post, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return nil, false
	}
	post, err := models.GetPostByID(a.DB, id)
	if err != nil {
		a.NotFound(w, r)
		return nil, false
	}
	if post.UserID != user.ID && !user.IsAdmin() {
		a.Forbidden(w, r)
		return nil, false
	}
	return post, true
}

func parseTags(raw string) []string {
	var tags []string
	for _, t := range strings.Split(raw, ",") {
		t = strings.TrimSpace(t)
		if t != "" {
			tags = append(tags, t)
		}
	}
	return tags
}

