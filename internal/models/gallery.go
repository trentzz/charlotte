package models

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// Album is a named collection of photos.
type Album struct {
	ID             int64
	UserID         int64
	ParentID       *int64
	Title          string
	Slug           string
	Description    string
	Published      bool
	IsDefault      bool
	DefaultChildID *int64
	CoverPhoto     *Photo
	FirstPhoto     *Photo // first photo in the album, used as fallback thumbnail
	PhotoCount     int
	SubAlbums      []*Album
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Photo represents a single uploaded image.
type Photo struct {
	ID                 int64
	UserID             int64
	AlbumID            int64
	Filename           string
	Caption            string
	MIMEType           string
	SizeBytes          int64
	Width              int
	Height             int
	CreatedAt          time.Time
	CompressedFilename string
	Version            int64
}

func scanPhoto(row interface{ Scan(...any) error }) (*Photo, error) {
	var p Photo
	var createdAt int64
	err := row.Scan(
		&p.ID, &p.UserID, &p.AlbumID, &p.Filename, &p.Caption,
		&p.MIMEType, &p.SizeBytes, &p.Width, &p.Height, &createdAt, &p.CompressedFilename, &p.Version,
	)
	if err != nil {
		return nil, err
	}
	p.CreatedAt = time.Unix(createdAt, 0)
	return &p, nil
}

const photoSelect = `SELECT id, user_id, album_id, filename, caption,
	mime_type, size_bytes, width, height, created_at, compressed_filename, version FROM photos`

// CreateAlbum inserts a new album and returns its ID.
func CreateAlbum(db *sql.DB, a *Album) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO gallery_albums (user_id, title, slug, description, parent_id) VALUES (?, ?, ?, ?, ?)`,
		a.UserID, a.Title, a.Slug, a.Description, a.ParentID,
	)
	if err != nil {
		return 0, fmt.Errorf("create album: %w", err)
	}
	return res.LastInsertId()
}

// GetAlbumBySlug returns an album for a user by slug, including sub-albums.
func GetAlbumBySlug(db *sql.DB, userID int64, slug string) (*Album, error) {
	a, err := scanAlbum(db.QueryRow(
		`SELECT id, user_id, parent_id, title, slug, description, published, is_default, cover_photo, created_at, updated_at, default_child_id
		 FROM gallery_albums WHERE user_id = ? AND slug = ?`, userID, slug,
	))
	if err != nil {
		return nil, err
	}
	a.SubAlbums, _ = ListSubAlbums(db, a.ID)
	return a, nil
}

// GetAlbumByID returns an album by its primary key, including sub-albums.
func GetAlbumByID(db *sql.DB, id int64) (*Album, error) {
	a, err := scanAlbum(db.QueryRow(
		`SELECT id, user_id, parent_id, title, slug, description, published, is_default, cover_photo, created_at, updated_at, default_child_id
		 FROM gallery_albums WHERE id = ?`, id,
	))
	if err != nil {
		return nil, err
	}
	a.SubAlbums, _ = ListSubAlbums(db, a.ID)
	return a, nil
}

func scanAlbum(row interface{ Scan(...any) error }) (*Album, error) {
	var a Album
	var published, isDefault int
	var parentID sql.NullInt64
	var coverPhotoID sql.NullInt64
	var defaultChildID sql.NullInt64
	var createdAt, updatedAt int64
	err := row.Scan(
		&a.ID, &a.UserID, &parentID, &a.Title, &a.Slug, &a.Description,
		&published, &isDefault, &coverPhotoID, &createdAt, &updatedAt, &defaultChildID,
	)
	if err != nil {
		return nil, err
	}
	if parentID.Valid {
		a.ParentID = &parentID.Int64
	}
	if defaultChildID.Valid {
		a.DefaultChildID = &defaultChildID.Int64
	}
	a.Published = published == 1
	a.IsDefault = isDefault == 1
	_ = coverPhotoID // cover photo loaded separately when needed
	a.CreatedAt = time.Unix(createdAt, 0)
	a.UpdatedAt = time.Unix(updatedAt, 0)
	return &a, nil
}

// SetAlbumPublished sets the published flag for an album.
func SetAlbumPublished(db *sql.DB, albumID int64, published bool) error {
	_, err := db.Exec(
		`UPDATE gallery_albums SET published = ?, updated_at = unixepoch() WHERE id = ?`,
		boolToInt(published), albumID,
	)
	return err
}

// listAlbumsByUserWhere is the shared implementation for album list queries.
// extraWhere is appended after "WHERE ga.user_id = ?" with no additional params.
func listAlbumsByUserWhere(db *sql.DB, userID int64, publishedOnly bool, extraWhere string) ([]*Album, error) {
	q := `SELECT ga.id, ga.user_id, ga.parent_id, ga.title, ga.slug, ga.description,
		        ga.published, ga.is_default, ga.cover_photo, ga.created_at, ga.updated_at,
		        COUNT(ap.photo_id) as photo_count, ga.default_child_id
		 FROM gallery_albums ga
		 LEFT JOIN album_photos ap ON ap.album_id = ga.id
		 WHERE ga.user_id = ?`
	if publishedOnly {
		q += ` AND ga.published = 1`
	}
	if extraWhere != "" {
		q += ` ` + extraWhere
	}
	q += ` GROUP BY ga.id ORDER BY ga.created_at DESC`
	rows, err := db.Query(q, userID)
	if err != nil {
		return nil, err
	}

	// Collect albums and cover photo IDs before closing rows.
	// Never call another DB function while rows is open with a limited connection pool.
	type coverEntry struct {
		idx     int
		photoID int64
	}
	var albums []*Album
	var covers []coverEntry
	for rows.Next() {
		var a Album
		var published, isDefault int
		var parentID sql.NullInt64
		var coverPhotoID sql.NullInt64
		var defaultChildID sql.NullInt64
		var createdAt, updatedAt int64
		if err := rows.Scan(
			&a.ID, &a.UserID, &parentID, &a.Title, &a.Slug, &a.Description,
			&published, &isDefault, &coverPhotoID, &createdAt, &updatedAt, &a.PhotoCount, &defaultChildID,
		); err != nil {
			rows.Close()
			return nil, err
		}
		if parentID.Valid {
			a.ParentID = &parentID.Int64
		}
		if defaultChildID.Valid {
			a.DefaultChildID = &defaultChildID.Int64
		}
		a.Published = published == 1
		a.IsDefault = isDefault == 1
		a.CreatedAt = time.Unix(createdAt, 0)
		a.UpdatedAt = time.Unix(updatedAt, 0)
		if coverPhotoID.Valid {
			covers = append(covers, coverEntry{len(albums), coverPhotoID.Int64})
		}
		albums = append(albums, &a)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Now safe to make additional DB calls.
	for _, c := range covers {
		photo, err := GetPhotoByID(db, c.photoID)
		if err == nil {
			albums[c.idx].CoverPhoto = photo
		}
	}
	// For albums with no explicit cover but at least one photo, load the first
	// photo so callers can use it as a fallback thumbnail.
	for i, a := range albums {
		if a.CoverPhoto == nil && a.PhotoCount > 0 {
			photo, err := GetFirstPhotoInAlbum(db, a.ID)
			if err == nil {
				albums[i].FirstPhoto = photo
			}
		}
	}
	return albums, nil
}

// GetFirstPhotoInAlbum returns the first photo in an album ordered by sort_order
// then created_at. Returns sql.ErrNoRows when the album has no photos.
func GetFirstPhotoInAlbum(db *sql.DB, albumID int64) (*Photo, error) {
	return scanPhoto(db.QueryRow(
		`SELECT p.id, p.user_id, p.album_id, p.filename, p.caption,
		        p.mime_type, p.size_bytes, p.width, p.height, p.created_at, p.compressed_filename, p.version
		 FROM photos p
		 JOIN album_photos ap ON ap.photo_id = p.id
		 WHERE ap.album_id = ?
		 ORDER BY ap.sort_order ASC, ap.created_at ASC
		 LIMIT 1`, albumID,
	))
}

// ListAlbumsByUser returns all albums for a user with photo counts.
// Pass publishedOnly=true for the public gallery view.
func ListAlbumsByUser(db *sql.DB, userID int64, publishedOnly bool) ([]*Album, error) {
	return listAlbumsByUserWhere(db, userID, publishedOnly, "")
}

// ListTopLevelAlbumsByUser returns albums with no parent (top-level only).
func ListTopLevelAlbumsByUser(db *sql.DB, userID int64, publishedOnly bool) ([]*Album, error) {
	return listAlbumsByUserWhere(db, userID, publishedOnly, "AND ga.parent_id IS NULL")
}

// SearchAlbumsByUser returns published top-level albums matching q in title or description.
func SearchAlbumsByUser(db *sql.DB, userID int64, q string) ([]*Album, error) {
	like := "%" + q + "%"
	rows, err := db.Query(`
		SELECT id, user_id, parent_id, title, slug, description, published, is_default,
		       cover_photo, created_at, updated_at, default_child_id
		FROM gallery_albums
		WHERE user_id = ? AND published = 1 AND parent_id IS NULL
		  AND (title LIKE ? OR description LIKE ?)
		ORDER BY created_at DESC LIMIT 10`,
		userID, like, like,
	)
	if err != nil {
		return nil, err
	}
	var albums []*Album
	for rows.Next() {
		a, err := scanAlbum(rows)
		if err != nil {
			continue
		}
		albums = append(albums, a)
	}
	rows.Close()
	return albums, rows.Err()
}

// DeleteAlbum removes an album. Photos are cascade-deleted by SQLite.
func DeleteAlbum(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM gallery_albums WHERE id = ?`, id)
	return err
}

// SetAlbumCover sets the cover photo for an album unconditionally.
func SetAlbumCover(db *sql.DB, albumID, photoID int64) error {
	_, err := db.Exec(
		`UPDATE gallery_albums SET cover_photo = ?, updated_at = unixepoch() WHERE id = ?`,
		photoID, albumID,
	)
	return err
}

// SetAlbumCoverIfNone sets the cover photo only when the album has no cover yet.
func SetAlbumCoverIfNone(db *sql.DB, albumID, photoID int64) error {
	_, err := db.Exec(
		`UPDATE gallery_albums SET cover_photo = ?, updated_at = unixepoch()
		 WHERE id = ? AND cover_photo IS NULL`,
		photoID, albumID,
	)
	return err
}

// getDefaultAlbumRow scans a single row into an Album using the standard select columns.
func getDefaultAlbumRow(db *sql.DB, userID int64) (*Album, error) {
	return scanAlbum(db.QueryRow(
		`SELECT id, user_id, parent_id, title, slug, description, published, is_default, cover_photo, created_at, updated_at, default_child_id
		 FROM gallery_albums WHERE user_id = ? AND is_default = 1 LIMIT 1`, userID,
	))
}

// GetDefaultAlbum returns the user's default album, creating one named "Uploads" if none exists.
func GetDefaultAlbum(db *sql.DB, userID int64) (*Album, error) {
	if a, err := getDefaultAlbumRow(db, userID); err == nil {
		return a, nil
	}

	// No default album found — create one named "Uploads" and mark it as default.
	id, err := CreateAlbum(db, &Album{
		UserID: userID,
		Title:  "Uploads",
		Slug:   "uploads",
	})
	if err != nil {
		// Slug collision or concurrent creation — retry reading the default.
		if a, err2 := getDefaultAlbumRow(db, userID); err2 == nil {
			return a, nil
		}
		return nil, err
	}
	// Mark the newly created album as the default.
	if _, err2 := db.Exec(
		`UPDATE gallery_albums SET is_default = 1 WHERE id = ?`, id,
	); err2 != nil {
		return nil, err2
	}
	return GetAlbumByID(db, id)
}

// SetDefaultAlbum marks albumID as the default for userID, clearing any previous default.
// Both updates run in a single transaction to avoid a window where no album is default.
func SetDefaultAlbum(db *sql.DB, albumID, userID int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.Exec(
		`UPDATE gallery_albums SET is_default = 0 WHERE user_id = ? AND is_default = 1`, userID,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(
		`UPDATE gallery_albums SET is_default = 1 WHERE id = ? AND user_id = ?`, albumID, userID,
	); err != nil {
		return err
	}
	return tx.Commit()
}

// CreatePhoto inserts a new photo record.
func CreatePhoto(db *sql.DB, p *Photo) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO photos (user_id, album_id, filename, caption, mime_type, size_bytes, width, height, compressed_filename)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.UserID, p.AlbumID, p.Filename, p.Caption,
		p.MIMEType, p.SizeBytes, p.Width, p.Height, p.CompressedFilename,
	)
	if err != nil {
		return 0, fmt.Errorf("create photo: %w", err)
	}
	return res.LastInsertId()
}

// GetPhotoByID returns a photo by its primary key.
func GetPhotoByID(db *sql.DB, id int64) (*Photo, error) {
	return scanPhoto(db.QueryRow(photoSelect+` WHERE id = ?`, id))
}

// ListPhotosByAlbum returns photos in an album via the album_photos join table.
func ListPhotosByAlbum(db *sql.DB, albumID int64) ([]*Photo, error) {
	q := `SELECT p.id, p.user_id, p.album_id, p.filename, p.caption,
		        p.mime_type, p.size_bytes, p.width, p.height, p.created_at, p.compressed_filename, p.version
		  FROM photos p
		  JOIN album_photos ap ON ap.photo_id = p.id
		  WHERE ap.album_id = ?
		  ORDER BY ap.sort_order ASC, ap.created_at ASC`
	rows, err := db.Query(q, albumID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPhotos(rows)
}

// ListAllPhotosByAlbum returns photos from this album and all its sub-albums.
func ListAllPhotosByAlbum(db *sql.DB, albumID int64) ([]*Photo, error) {
	q := `SELECT DISTINCT p.id, p.user_id, p.album_id, p.filename, p.caption,
		        p.mime_type, p.size_bytes, p.width, p.height, p.created_at, p.compressed_filename, p.version
		  FROM photos p
		  JOIN album_photos ap ON ap.photo_id = p.id
		  WHERE ap.album_id = ? OR ap.album_id IN (
		    SELECT id FROM gallery_albums WHERE parent_id = ?
		  )
		  ORDER BY p.created_at DESC`
	rows, err := db.Query(q, albumID, albumID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPhotos(rows)
}

// ListSubAlbums returns direct children of a parent album.
func ListSubAlbums(db *sql.DB, parentID int64) ([]*Album, error) {
	rows, err := db.Query(
		`SELECT id, user_id, parent_id, title, slug, description, published, is_default, cover_photo, created_at, updated_at, default_child_id
		 FROM gallery_albums WHERE parent_id = ? ORDER BY created_at ASC`, parentID,
	)
	if err != nil {
		return nil, err
	}
	var albums []*Album
	for rows.Next() {
		a, err := scanAlbum(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		albums = append(albums, a)
	}
	rows.Close()
	return albums, rows.Err()
}

// AddPhotoToAlbum adds a photo to an album via the join table.
func AddPhotoToAlbum(db *sql.DB, albumID, photoID int64) error {
	_, err := db.Exec(
		`INSERT OR IGNORE INTO album_photos (album_id, photo_id) VALUES (?, ?)`,
		albumID, photoID,
	)
	return err
}

// RemovePhotoFromAlbum removes a photo from an album without deleting the photo.
func RemovePhotoFromAlbum(db *sql.DB, albumID, photoID int64) error {
	_, err := db.Exec(
		`DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?`,
		albumID, photoID,
	)
	return err
}

// ListUserPhotosAll returns all photos for a user regardless of album, newest first.
func ListUserPhotosAll(db *sql.DB, userID int64, limit int) ([]*Photo, error) {
	rows, err := db.Query(
		photoSelect+` WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPhotos(rows)
}

// ListPhotoIDsInAlbum returns the set of photo IDs already in an album.
func ListPhotoIDsInAlbum(db *sql.DB, albumID int64) (map[int64]bool, error) {
	rows, err := db.Query(`SELECT photo_id FROM album_photos WHERE album_id = ?`, albumID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]bool)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

// ListRecentPhotosByUser returns the N most recent photos for a user.
func ListRecentPhotosByUser(db *sql.DB, userID int64, limit int) ([]*Photo, error) {
	rows, err := db.Query(
		photoSelect+` WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPhotos(rows)
}

func scanPhotos(rows *sql.Rows) ([]*Photo, error) {
	var photos []*Photo
	for rows.Next() {
		p, err := scanPhoto(rows)
		if err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}
	return photos, rows.Err()
}

// FindOtherAlbumForPhoto returns the ID of an album that contains the photo
// but is not in the excludeAlbumIDs set. Returns 0 when no such album exists,
// meaning the photo is exclusive to the excluded set and may be safely deleted.
func FindOtherAlbumForPhoto(db *sql.DB, photoID int64, excludeAlbumIDs []int64) (int64, error) {
	placeholders := make([]string, len(excludeAlbumIDs))
	args := make([]any, 0, 1+len(excludeAlbumIDs))
	args = append(args, photoID)
	for i, id := range excludeAlbumIDs {
		placeholders[i] = "?"
		args = append(args, id)
	}
	q := fmt.Sprintf(
		`SELECT album_id FROM album_photos WHERE photo_id = ? AND album_id NOT IN (%s) LIMIT 1`,
		strings.Join(placeholders, ","),
	)
	var albumID int64
	err := db.QueryRow(q, args...).Scan(&albumID)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return albumID, err
}

// SetAlbumDefaultChild sets or clears the default landing sub-album for a parent album.
// When childID is non-nil, it validates that the child's parent_id equals albumID.
func SetAlbumDefaultChild(db *sql.DB, albumID int64, childID *int64) error {
	if childID != nil {
		// Validate that the nominated child actually belongs to this parent.
		var parentID sql.NullInt64
		err := db.QueryRow(
			`SELECT parent_id FROM gallery_albums WHERE id = ?`, *childID,
		).Scan(&parentID)
		if err != nil {
			return fmt.Errorf("child album not found: %w", err)
		}
		if !parentID.Valid || parentID.Int64 != albumID {
			return fmt.Errorf("album %d is not a child of album %d", *childID, albumID)
		}
	}
	_, err := db.Exec(
		`UPDATE gallery_albums SET default_child_id = ?, updated_at = unixepoch() WHERE id = ?`,
		childID, albumID,
	)
	return err
}

// RehomePhoto updates a photo's primary album_id to the given album.
// This is used before album deletion to prevent the ON DELETE CASCADE on
// photos.album_id from destroying photos that are shared with other albums.
func RehomePhoto(db *sql.DB, photoID, newAlbumID int64) error {
	_, err := db.Exec(`UPDATE photos SET album_id = ? WHERE id = ?`, newAlbumID, photoID)
	return err
}

// DeletePhoto removes a photo record and returns the deleted photo (for file cleanup).
func DeletePhoto(db *sql.DB, id int64) (*Photo, error) {
	photo, err := GetPhotoByID(db, id)
	if err != nil {
		return nil, err
	}
	// If this photo was the cover of its album, clear the cover.
	_, _ = db.Exec(
		`UPDATE gallery_albums SET cover_photo = NULL WHERE cover_photo = ?`, id,
	)
	if _, err := db.Exec(`DELETE FROM photos WHERE id = ?`, id); err != nil {
		return nil, fmt.Errorf("delete photo: %w", err)
	}
	return photo, nil
}

// ListAllPhotos returns all photos for admin use.
func ListAllPhotos(db *sql.DB) ([]*Photo, error) {
	rows, err := db.Query(photoSelect + ` ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPhotos(rows)
}

// IncrementPhotoVersion increments the version counter for a photo and returns the new value.
func IncrementPhotoVersion(db *sql.DB, photoID int64) (int64, error) {
	_, err := db.Exec(`UPDATE photos SET version = version + 1 WHERE id = ?`, photoID)
	if err != nil {
		return 0, fmt.Errorf("increment photo version: %w", err)
	}
	var v int64
	err = db.QueryRow(`SELECT version FROM photos WHERE id = ?`, photoID).Scan(&v)
	return v, err
}
