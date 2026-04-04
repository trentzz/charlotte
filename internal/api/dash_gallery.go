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

// DashGalleryList handles GET /api/v1/dashboard/gallery — list all albums.
func (a *App) DashGalleryList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	albums, err := models.ListAlbumsByUser(a.DB, user.ID, false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"albums": toAlbumList(albums)})
}

// DashAlbumCreate handles POST /api/v1/dashboard/gallery/albums — create a new album.
func (a *App) DashAlbumCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())

	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
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
	s := makeUniqueSlug(a.DB, "gallery_albums", user.ID, 0, slug.Make(title))
	id, err := models.CreateAlbum(a.DB, &models.Album{
		UserID:      user.ID,
		Title:       title,
		Slug:        s,
		Description: strings.TrimSpace(body.Description),
	})
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	album, err := models.GetAlbumByID(a.DB, id)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusCreated, toAlbumJSON(album))
}

// DashAlbumGet handles GET /api/v1/dashboard/gallery/albums/{id} — album with photos.
func (a *App) DashAlbumGet(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	photos, err := models.ListPhotosByAlbum(a.DB, album.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"album":  toAlbumJSON(album),
		"photos": toPhotoList(photos),
	})
}

// DashAlbumToggle handles PATCH /api/v1/dashboard/gallery/albums/{id}/toggle.
func (a *App) DashAlbumToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	if err := models.SetAlbumPublished(a.DB, album.ID, !album.Published); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"published": !album.Published})
}

// DashAlbumDelete handles DELETE /api/v1/dashboard/gallery/albums/{id}.
func (a *App) DashAlbumDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	// Delete all associated photo files from disk.
	photos, _ := models.ListPhotosByAlbum(a.DB, album.ID)
	for _, p := range photos {
		_ = storage.DeleteUpload(a.DataDir, p.UserID, p.Filename)
	}
	if err := models.DeleteAlbum(a.DB, album.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "album deleted"})
}

// DashAlbumSetCover handles PUT /api/v1/dashboard/gallery/albums/{id}/cover.
func (a *App) DashAlbumSetCover(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}

	var body struct {
		PhotoID int64 `json:"photo_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.PhotoID == 0 {
		a.respondError(w, http.StatusBadRequest, "photo_id is required")
		return
	}
	_ = models.SetAlbumCover(a.DB, album.ID, body.PhotoID)
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "cover updated"})
}

// DashPhotoUpload handles POST /api/v1/dashboard/gallery/photos — multipart upload.
// Form fields: album_id (int, 0 = General), files: photos[]
func (a *App) DashPhotoUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	// Allow up to 20 files at MaxUploadBytes each.
	if err := r.ParseMultipartForm(20*storage.MaxUploadBytes + (1 << 20)); err != nil {
		a.respondError(w, http.StatusBadRequest, "bad request")
		return
	}

	albumIDStr := r.FormValue("album_id")
	albumID, _ := strconv.ParseInt(albumIDStr, 10, 64)
	var album *models.Album
	if albumID == 0 {
		var err error
		album, err = models.GetOrCreateGeneralAlbum(a.DB, user.ID)
		if err != nil {
			a.internalError(w, r, err)
			return
		}
	} else {
		var ok bool
		album, ok = a.getOwnedAlbumByID(w, r, user, albumID)
		if !ok {
			return
		}
	}

	files := r.MultipartForm.File["photos"]
	if len(files) == 0 {
		a.respondError(w, http.StatusBadRequest, "no files selected")
		return
	}

	caption := strings.TrimSpace(r.FormValue("caption"))
	var uploaded []photoJSON
	failed := 0
	for _, fhdr := range files {
		result, err := storage.SaveUpload(a.DataDir, user.ID, fhdr)
		if err != nil {
			failed++
			continue
		}
		photoID, err := models.CreatePhoto(a.DB, &models.Photo{
			UserID:    user.ID,
			AlbumID:   album.ID,
			Filename:  result.Filename,
			Caption:   caption,
			MIMEType:  result.MIMEType,
			SizeBytes: result.SizeBytes,
			Width:     result.Width,
			Height:    result.Height,
		})
		if err != nil {
			_ = storage.DeleteUpload(a.DataDir, user.ID, result.Filename)
			failed++
			continue
		}
		_ = models.SetAlbumCoverIfNone(a.DB, album.ID, photoID)
		if p, err := models.GetPhotoByID(a.DB, photoID); err == nil {
			uploaded = append(uploaded, toPhotoJSON(p))
		}
	}

	if uploaded == nil {
		uploaded = []photoJSON{}
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"uploaded": uploaded,
		"failed":   failed,
		"message":  fmt.Sprintf("%d uploaded, %d failed", len(uploaded), failed),
	})
}

// DashPhotoDelete handles DELETE /api/v1/dashboard/gallery/photos/{id}.
func (a *App) DashPhotoDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	photoID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}
	photo, err := models.GetPhotoByID(a.DB, photoID)
	if err != nil || (photo.UserID != user.ID && !user.IsAdmin()) {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}
	deleted, err := models.DeletePhoto(a.DB, photoID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	_ = storage.DeleteUpload(a.DataDir, deleted.UserID, deleted.Filename)
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "photo deleted"})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (a *App) getOwnedAlbum(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Album, bool) {
	return a.getOwnedAlbumByID(w, r, user, 0)
}

func (a *App) getOwnedAlbumByID(w http.ResponseWriter, r *http.Request, user *models.User, id int64) (*models.Album, bool) {
	if id == 0 {
		var err error
		id, err = strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			a.respondError(w, http.StatusNotFound, "album not found")
			return nil, false
		}
	}
	album, err := models.GetAlbumByID(a.DB, id)
	if err != nil || (album.UserID != user.ID && !user.IsAdmin()) {
		a.respondError(w, http.StatusNotFound, "album not found")
		return nil, false
	}
	return album, true
}
