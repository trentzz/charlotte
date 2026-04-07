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
		ParentID    *int64 `json:"parent_id"`
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

	// Validate parent album ownership when provided.
	if body.ParentID != nil {
		parent, err := models.GetAlbumByID(a.DB, *body.ParentID)
		if err != nil || (parent.UserID != user.ID && !user.IsAdmin()) {
			a.respondError(w, http.StatusNotFound, "parent album not found")
			return
		}
	}

	s := makeUniqueSlug(a.DB, "gallery_albums", user.ID, 0, slug.Make(title))
	id, err := models.CreateAlbum(a.DB, &models.Album{
		UserID:      user.ID,
		ParentID:    body.ParentID,
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

// DashAlbumUpdate handles PUT /api/v1/dashboard/gallery/albums/{id} — update title and description.
func (a *App) DashAlbumUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}

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

	finalSlug := makeUniqueSlug(a.DB, "gallery_albums", album.UserID, album.ID, slug.Make(title))

	if err := models.UpdateAlbum(a.DB, album.ID, title, strings.TrimSpace(body.Description), finalSlug); err != nil {
		a.internalError(w, r, err)
		return
	}
	album.Title = title
	album.Description = strings.TrimSpace(body.Description)
	album.Slug = finalSlug
	a.respondJSON(w, http.StatusOK, toAlbumJSON(album))
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
	allPhotos, err := models.ListAllPhotosByAlbum(a.DB, album.ID)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"album":      toAlbumJSON(album),
		"photos":     toPhotoList(photos),
		"all_photos": toPhotoList(allPhotos),
	})
}

// DashAlbumAddPhoto handles POST /api/v1/dashboard/gallery/albums/{id}/photos.
func (a *App) DashAlbumAddPhoto(w http.ResponseWriter, r *http.Request) {
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

	// Verify the photo belongs to this user.
	photo, err := models.GetPhotoByID(a.DB, body.PhotoID)
	if err != nil || (photo.UserID != user.ID && !user.IsAdmin()) {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}

	if err := models.AddPhotoToAlbum(a.DB, album.ID, body.PhotoID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// DashAlbumRemovePhoto handles DELETE /api/v1/dashboard/gallery/albums/{id}/photos/{photoID}.
func (a *App) DashAlbumRemovePhoto(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}

	photoID, err := strconv.ParseInt(r.PathValue("photoID"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}

	// Verify ownership.
	photo, err := models.GetPhotoByID(a.DB, photoID)
	if err != nil || (photo.UserID != user.ID && !user.IsAdmin()) {
		a.respondError(w, http.StatusNotFound, "photo not found")
		return
	}

	if err := models.RemovePhotoFromAlbum(a.DB, album.ID, photoID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// DashUserPhotos handles GET /api/v1/dashboard/gallery/photos — all photos for the logged-in user.
func (a *App) DashUserPhotos(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	photos, err := models.ListUserPhotosAll(a.DB, user.ID, 500)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"photos": toPhotoList(photos)})
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

// DashAlbumSetDefault handles PATCH /api/v1/dashboard/gallery/albums/{id}/default
// — marks this album as the user's default upload destination.
func (a *App) DashAlbumSetDefault(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	if err := models.SetDefaultAlbum(a.DB, album.ID, user.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"is_default": true})
}

// DashAlbumDelete handles DELETE /api/v1/dashboard/gallery/albums/{id}.
func (a *App) DashAlbumDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}

	// Collect every album_id that will be deleted (the album and its sub-albums).
	deletedAlbumIDs := []int64{album.ID}
	for _, sub := range album.SubAlbums {
		deletedAlbumIDs = append(deletedAlbumIDs, sub.ID)
	}

	// Gather all photos from this album and its sub-albums.
	photos, _ := models.ListAllPhotosByAlbum(a.DB, album.ID)

	// For each photo, check whether it belongs to any album outside the set
	// being deleted. If it does, re-home the photo to one of those albums so
	// the ON DELETE CASCADE on photos.album_id does not destroy it. Otherwise,
	// delete the file from disk (the DB row is removed by the cascade below).
	for _, p := range photos {
		otherAlbumID, err := models.FindOtherAlbumForPhoto(a.DB, p.ID, deletedAlbumIDs)
		if err != nil {
			a.internalError(w, r, err)
			return
		}
		if otherAlbumID != 0 {
			// Photo is shared — move its primary album_id so the cascade spares it.
			if err := models.RehomePhoto(a.DB, p.ID, otherAlbumID); err != nil {
				a.internalError(w, r, err)
				return
			}
			continue
		}
		// Photo is exclusive to this album set — delete the file from disk.
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
	photo, err := models.GetPhotoByID(a.DB, body.PhotoID)
	if err != nil || photo == nil || photo.UserID != user.ID {
		a.respondError(w, http.StatusForbidden, "photo not found")
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
		album, err = models.GetDefaultAlbum(a.DB, user.ID)
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
			UserID:             user.ID,
			AlbumID:            album.ID,
			Filename:           result.Filename,
			Caption:            caption,
			MIMEType:           result.MIMEType,
			SizeBytes:          result.SizeBytes,
			Width:              result.Width,
			Height:             result.Height,
			CompressedFilename: result.CompressedFilename,
		})
		if err != nil {
			_ = storage.DeleteUpload(a.DataDir, user.ID, result.Filename)
			failed++
			continue
		}
		_ = models.AddPhotoToAlbum(a.DB, album.ID, photoID)
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

// DashAlbumSetDefaultChild handles PATCH /api/v1/dashboard/gallery/albums/{id}/default-child.
// Body: {"child_id": 123} to set, or {"child_id": null} to clear.
func (a *App) DashAlbumSetDefaultChild(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}

	var body struct {
		ChildID *int64 `json:"child_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := models.SetAlbumDefaultChild(a.DB, album.ID, body.ChildID); err != nil {
		a.respondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// DashPhotoRotate handles PATCH /api/v1/dashboard/gallery/photos/{id}/rotate.
// Body: {"degrees": 90} for CW, {"degrees": -90} for CCW.
func (a *App) DashPhotoRotate(w http.ResponseWriter, r *http.Request) {
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

	var body struct {
		Degrees int `json:"degrees"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Degrees != 90 && body.Degrees != -90 && body.Degrees != 180 {
		a.respondError(w, http.StatusBadRequest, "degrees must be 90, -90, or 180")
		return
	}

	if err := storage.RotatePhoto(a.DataDir, photo.UserID, photo.Filename, photo.CompressedFilename, body.Degrees); err != nil {
		a.internalError(w, r, err)
		return
	}
	newVersion, err := models.IncrementPhotoVersion(a.DB, photoID)
	if err != nil {
		// Non-fatal: log and return ok without a version so the frontend still knows rotation succeeded.
		fmt.Printf("warn: increment photo version for photo %d: %v\n", photoID, err)
		a.respondJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"ok": true, "version": newVersion})
}

// DashAlbumTheme handles PATCH /api/v1/dashboard/gallery/albums/{id}/theme.
func (a *App) DashAlbumTheme(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
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
	if err := models.UpdateContentTheme(a.DB, "gallery_albums", album.ID, theme, body.Enabled); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"enabled": body.Enabled, "theme": theme})
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
