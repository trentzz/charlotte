package api

import (
	"net/http"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// GalleryHome handles GET /api/v1/u/{username}/gallery.
func (a *App) GalleryHome(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureGallery {
		a.respondError(w, http.StatusNotFound, "gallery not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID
	albums, _ := models.ListTopLevelAlbumsByUser(a.DB, profile.ID, true)
	recent, _ := models.ListRecentPhotosByUser(a.DB, profile.ID, 12, true)

	a.respondJSON(w, http.StatusOK, map[string]any{
		"albums":        toAlbumList(albums),
		"recent_photos": toPhotoList(recent),
		"is_owner":      isOwner,
	})
}

// GalleryAlbum handles GET /api/v1/u/{username}/gallery/{album_slug}.
func (a *App) GalleryAlbum(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	albumSlug := r.PathValue("album")
	profile, err := models.GetUserByUsername(a.DB, username)
	if err != nil || profile == nil || !profile.IsActive() {
		a.respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if !profile.FeatureGallery {
		a.respondError(w, http.StatusNotFound, "gallery not enabled for this user")
		return
	}

	viewer := middleware.UserFromContext(r.Context())
	isOwner := viewer != nil && viewer.ID == profile.ID

	album, err := models.GetAlbumBySlug(a.DB, profile.ID, albumSlug)
	if err != nil || !album.Published {
		a.respondError(w, http.StatusNotFound, "album not found")
		return
	}

	var photos []*models.Photo
	if r.URL.Query().Get("filter") == "all" {
		photos, _ = models.ListAllPhotosByAlbum(a.DB, album.ID)
	} else {
		photos, _ = models.ListPhotosByAlbum(a.DB, album.ID)
	}

	var subAlbums []*models.Album
	for _, s := range album.SubAlbums {
		if s.Published {
			subAlbums = append(subAlbums, s)
		}
	}

	// Sub-albums without a custom theme inherit the parent album's theme.
	if album.ThemeEnabled {
		for _, s := range subAlbums {
			if !s.ThemeEnabled {
				s.ThemeEnabled = true
				s.Theme = album.Theme
			}
		}
	}

	resp := map[string]any{
		"album":      toAlbumJSON(album),
		"photos":     toPhotoList(photos),
		"is_owner":   isOwner,
		"sub_albums": toAlbumList(subAlbums),
	}

	// If this is a sub-album, include the parent album so the frontend can
	// render sibling navigation without a second round-trip.
	if album.ParentID != nil {
		parent, err := models.GetAlbumByID(a.DB, *album.ParentID)
		if err == nil && (parent.Published || isOwner) {
			resp["parent_album"] = toAlbumJSON(parent)
		}
	}

	a.respondJSON(w, http.StatusOK, resp)
}
