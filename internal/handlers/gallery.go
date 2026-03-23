package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/slug"
	"github.com/trentzz/charlotte/internal/storage"
)

// ── Public gallery views ───────────────────────────────────────────────────────

type galleryHomeData struct {
	PageData
	Profile *models.User
	Albums  []*models.Album
	Recent  []*models.Photo
}

// GalleryHome renders /u/{username}/gallery/.
func (a *App) GalleryHome(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureGallery {
		a.NotFound(w, r)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	albums, _ := models.ListAlbumsByUser(a.DB, profile.ID, !isOwner)
	recent, _ := models.ListRecentPhotosByUser(a.DB, profile.ID, 12)

	a.Tmpl.Render(w, http.StatusOK, "user/gallery_home", galleryHomeData{
		PageData: a.newPage(r, profile.DisplayOrUsername()+"'s Gallery"),
		Profile:  profile,
		Albums:   albums,
		Recent:   recent,
	})
}

type galleryAlbumData struct {
	PageData
	Profile *models.User
	Album   *models.Album
	Photos  []*models.Photo
}

// GalleryAlbum renders /u/{username}/gallery/{album}.
func (a *App) GalleryAlbum(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	albumSlug := r.PathValue("album")
	profile := a.resolveProfile(w, r, username)
	if profile == nil {
		return
	}
	if !profile.FeatureGallery {
		a.NotFound(w, r)
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	album, err := models.GetAlbumBySlug(a.DB, profile.ID, albumSlug)
	if err != nil || (!album.Published && !isOwner) {
		a.NotFound(w, r)
		return
	}
	photos, _ := models.ListPhotosByAlbum(a.DB, album.ID)

	a.Tmpl.Render(w, http.StatusOK, "user/gallery_album", galleryAlbumData{
		PageData: a.newPage(r, album.Title),
		Profile:  profile,
		Album:    album,
		Photos:   photos,
	})
}

// ── Dashboard gallery ──────────────────────────────────────────────────────────

type dashGalleryData struct {
	PageData
	Albums []*models.Album
}

type dashAlbumData struct {
	PageData
	Album  *models.Album
	Photos []*models.Photo
}

// DashboardGalleryList renders GET /dashboard/gallery/.
func (a *App) DashboardGalleryList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	albums, err := models.ListAlbumsByUser(a.DB, user.ID, false)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	pd := a.newPage(r, "My Gallery")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/gallery", dashGalleryData{PageData: pd, Albums: albums})
}

// DashboardAlbumView renders GET /dashboard/gallery/album/{id} — manage photos in an album.
func (a *App) DashboardAlbumView(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	photos, err := models.ListPhotosByAlbum(a.DB, album.ID)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	pd := a.newPage(r, album.Title)
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "dashboard/gallery_album", dashAlbumData{
		PageData: pd,
		Album:    album,
		Photos:   photos,
	})
}

// DashboardAlbumCreate handles POST /dashboard/gallery/album/new.
func (a *App) DashboardAlbumCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	title := strings.TrimSpace(r.FormValue("title"))
	if title == "" {
		http.Redirect(w, r, "/dashboard/gallery/?flash=Title+is+required.", http.StatusSeeOther)
		return
	}
	s := makeUniqueSlug(a.DB, "gallery_albums", user.ID, 0, slug.Make(title))
	if _, err := models.CreateAlbum(a.DB, &models.Album{
		UserID:      user.ID,
		Title:       title,
		Slug:        s,
		Description: r.FormValue("description"),
	}); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/gallery/?flash=Album+created.", http.StatusSeeOther)
}

// DashboardAlbumToggle handles POST /dashboard/gallery/album/{id}/toggle — flips published.
func (a *App) DashboardAlbumToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	if err := models.SetAlbumPublished(a.DB, album.ID, !album.Published); err != nil {
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/gallery/?flash=Visibility+updated.", http.StatusSeeOther)
}

// DashboardAlbumDelete handles POST /dashboard/gallery/album/{id}/delete.
func (a *App) DashboardAlbumDelete(w http.ResponseWriter, r *http.Request) {
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
		a.InternalError(w, r, err)
		return
	}
	http.Redirect(w, r, "/dashboard/gallery/?flash=Album+deleted.", http.StatusSeeOther)
}

// DashboardPhotoUpload handles POST /dashboard/gallery/upload.
// album_id=0 means "General" — auto-create the General album if needed.
// Accepts multiple files via the "photos" field.
func (a *App) DashboardPhotoUpload(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	// Allow up to 20 files at 10 MB each plus overhead.
	if err := r.ParseMultipartForm(20*storage.MaxUploadBytes + (1 << 20)); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Resolve the target album (0 = General).
	albumIDStr := r.FormValue("album_id")
	albumID, _ := strconv.ParseInt(albumIDStr, 10, 64)
	var album *models.Album
	if albumID == 0 {
		var err error
		album, err = models.GetOrCreateGeneralAlbum(a.DB, user.ID)
		if err != nil {
			a.InternalError(w, r, err)
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
		http.Redirect(w, r, fmt.Sprintf("/dashboard/gallery/album/%d?flash=No+files+selected.", album.ID), http.StatusSeeOther)
		return
	}

	caption := strings.TrimSpace(r.FormValue("caption"))
	uploaded, failed := 0, 0
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
		// Set as cover if album has none (only fires once; subsequent calls are no-ops).
		_ = models.SetAlbumCoverIfNone(a.DB, album.ID, photoID)
		uploaded++
	}

	var flash string
	switch {
	case failed == 0:
		flash = fmt.Sprintf("%d+photo(s)+uploaded.", uploaded)
	case uploaded == 0:
		flash = fmt.Sprintf("%d+upload(s)+failed+(unsupported+type+or+too+large).", failed)
	default:
		flash = fmt.Sprintf("%d+uploaded,+%d+failed.", uploaded, failed)
	}
	http.Redirect(w, r, fmt.Sprintf("/dashboard/gallery/album/%d?flash=%s", album.ID, flash), http.StatusSeeOther)
}

// DashboardPhotoDelete handles POST /dashboard/gallery/photo/{id}/delete.
func (a *App) DashboardPhotoDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	photoID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.NotFound(w, r)
		return
	}
	photo, err := models.GetPhotoByID(a.DB, photoID)
	if err != nil || (photo.UserID != user.ID && !user.IsAdmin()) {
		a.NotFound(w, r)
		return
	}

	deleted, err := models.DeletePhoto(a.DB, photoID)
	if err != nil {
		a.InternalError(w, r, err)
		return
	}
	_ = storage.DeleteUpload(a.DataDir, deleted.UserID, deleted.Filename)
	http.Redirect(w, r, fmt.Sprintf("/dashboard/gallery/album/%d?flash=Photo+deleted.", deleted.AlbumID), http.StatusSeeOther)
}

// DashboardSetCover handles POST /dashboard/gallery/album/{id}/cover.
func (a *App) DashboardSetCover(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	album, ok := a.getOwnedAlbum(w, r, user)
	if !ok {
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	photoID, err := strconv.ParseInt(r.FormValue("photo_id"), 10, 64)
	if err != nil {
		http.Redirect(w, r, "/dashboard/gallery/?flash=Invalid+photo.", http.StatusSeeOther)
		return
	}
	_ = models.SetAlbumCover(a.DB, album.ID, photoID)
	http.Redirect(w, r, fmt.Sprintf("/dashboard/gallery/album/%d?flash=Cover+updated.", album.ID), http.StatusSeeOther)
}

// ServeUpload serves an uploaded file from /uploads/{userID}/{filename}.
func (a *App) ServeUpload(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.PathValue("userID")
	filename := r.PathValue("filename")

	// Validate to prevent path traversal.
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if userIDStr == "" || filename == "" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, a.DataDir+"/uploads/"+userIDStr+"/"+filename)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func (a *App) getOwnedAlbum(w http.ResponseWriter, r *http.Request, user *models.User) (*models.Album, bool) {
	return a.getOwnedAlbumByID(w, r, user, 0)
}

func (a *App) getOwnedAlbumByID(w http.ResponseWriter, r *http.Request, user *models.User, id int64) (*models.Album, bool) {
	if id == 0 {
		var err error
		id, err = strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			a.NotFound(w, r)
			return nil, false
		}
	}
	album, err := models.GetAlbumByID(a.DB, id)
	if err != nil || (album.UserID != user.ID && !user.IsAdmin()) {
		a.NotFound(w, r)
		return nil, false
	}
	return album, true
}
