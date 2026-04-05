package models

import (
	"database/sql"
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

// mustCreateAlbum inserts an album and returns its ID.
func mustCreateAlbum(t *testing.T, db *sql.DB, userID int64, title, slug string) int64 {
	t.Helper()
	id, err := CreateAlbum(db, &Album{
		UserID: userID,
		Title:  title,
		Slug:   slug,
	})
	if err != nil {
		t.Fatalf("mustCreateAlbum(%q): %v", title, err)
	}
	return id
}

// mustCreatePhoto inserts a photo into an album and returns its ID.
func mustCreatePhoto(t *testing.T, db *sql.DB, userID, albumID int64, filename string) int64 {
	t.Helper()
	id, err := CreatePhoto(db, &Photo{
		UserID:   userID,
		AlbumID:  albumID,
		Filename: filename,
		MIMEType: "image/jpeg",
	})
	if err != nil {
		t.Fatalf("mustCreatePhoto(%q): %v", filename, err)
	}
	return id
}

func TestCreateAlbum_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, err := CreateAlbum(db, &Album{
		UserID: userID,
		Title:  "Summer",
		Slug:   "summer",
	})
	if err != nil {
		t.Fatalf("CreateAlbum: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestGetAlbumBySlug(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	mustCreateAlbum(t, db, userID, "Summer", "summer")

	a, err := GetAlbumBySlug(db, userID, "summer")
	if err != nil {
		t.Fatalf("GetAlbumBySlug: %v", err)
	}
	if a.Title != "Summer" {
		t.Errorf("expected Summer, got %q", a.Title)
	}
}

func TestGetAlbumBySlug_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	_, err := GetAlbumBySlug(db, userID, "nonexistent")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetAlbumByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateAlbum(t, db, userID, "Summer", "summer")

	a, err := GetAlbumByID(db, id)
	if err != nil {
		t.Fatalf("GetAlbumByID: %v", err)
	}
	if a.ID != id {
		t.Errorf("expected ID %d, got %d", id, a.ID)
	}
}

func TestGetAlbumByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)

	_, err := GetAlbumByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestSetAlbumPublished(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateAlbum(t, db, userID, "Summer", "summer")

	if err := SetAlbumPublished(db, id, true); err != nil {
		t.Fatalf("SetAlbumPublished: %v", err)
	}

	a, _ := GetAlbumByID(db, id)
	if !a.Published {
		t.Error("album should be published")
	}

	_ = SetAlbumPublished(db, id, false)
	a, _ = GetAlbumByID(db, id)
	if a.Published {
		t.Error("album should be unpublished")
	}
}

func TestListAlbumsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id1 := mustCreateAlbum(t, db, userID, "Published Album", "pub")
	id2 := mustCreateAlbum(t, db, userID, "Private Album", "priv")
	// Albums default to published=1; explicitly unpublish the private one.
	_ = SetAlbumPublished(db, id2, false)
	_ = id1

	tests := []struct {
		name          string
		publishedOnly bool
		wantCount     int
	}{
		{"all", false, 2},
		{"published only", true, 1},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			albums, err := ListAlbumsByUser(db, userID, tc.publishedOnly)
			if err != nil {
				t.Fatalf("ListAlbumsByUser: %v", err)
			}
			if len(albums) != tc.wantCount {
				t.Errorf("expected %d albums, got %d", tc.wantCount, len(albums))
			}
		})
	}
}

func TestListTopLevelAlbumsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	parentID := mustCreateAlbum(t, db, userID, "Parent", "parent")
	// Create a sub-album by setting parent_id.
	childID, err := CreateAlbum(db, &Album{
		UserID:   userID,
		Title:    "Child",
		Slug:     "child",
		ParentID: &parentID,
	})
	if err != nil {
		t.Fatalf("CreateAlbum child: %v", err)
	}
	_ = childID

	albums, err := ListTopLevelAlbumsByUser(db, userID, false)
	if err != nil {
		t.Fatalf("ListTopLevelAlbumsByUser: %v", err)
	}
	if len(albums) != 1 {
		t.Errorf("expected 1 top-level album, got %d", len(albums))
	}
	if albums[0].Title != "Parent" {
		t.Errorf("expected Parent, got %q", albums[0].Title)
	}
}

func TestDeleteAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateAlbum(t, db, userID, "Summer", "summer")

	if err := DeleteAlbum(db, id); err != nil {
		t.Fatalf("DeleteAlbum: %v", err)
	}

	_, err := GetAlbumByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestCreatePhoto_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")

	id, err := CreatePhoto(db, &Photo{
		UserID:   userID,
		AlbumID:  albumID,
		Filename: "photo.jpg",
		MIMEType: "image/jpeg",
	})
	if err != nil {
		t.Fatalf("CreatePhoto: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestGetPhotoByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	id := mustCreatePhoto(t, db, userID, albumID, "photo.jpg")

	p, err := GetPhotoByID(db, id)
	if err != nil {
		t.Fatalf("GetPhotoByID: %v", err)
	}
	if p.Filename != "photo.jpg" {
		t.Errorf("expected photo.jpg, got %q", p.Filename)
	}
}

func TestGetPhotoByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetPhotoByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestAddPhotoToAlbum_ListPhotosByAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photoID := mustCreatePhoto(t, db, userID, albumID, "photo.jpg")

	if err := AddPhotoToAlbum(db, albumID, photoID); err != nil {
		t.Fatalf("AddPhotoToAlbum: %v", err)
	}

	photos, err := ListPhotosByAlbum(db, albumID)
	if err != nil {
		t.Fatalf("ListPhotosByAlbum: %v", err)
	}
	if len(photos) != 1 {
		t.Fatalf("expected 1 photo, got %d", len(photos))
	}
	if photos[0].ID != photoID {
		t.Errorf("photo ID mismatch: got %d, want %d", photos[0].ID, photoID)
	}
}

func TestRemovePhotoFromAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photoID := mustCreatePhoto(t, db, userID, albumID, "photo.jpg")

	_ = AddPhotoToAlbum(db, albumID, photoID)
	if err := RemovePhotoFromAlbum(db, albumID, photoID); err != nil {
		t.Fatalf("RemovePhotoFromAlbum: %v", err)
	}

	photos, _ := ListPhotosByAlbum(db, albumID)
	if len(photos) != 0 {
		t.Errorf("expected 0 photos after removal, got %d", len(photos))
	}
}

func TestDeletePhoto(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	id := mustCreatePhoto(t, db, userID, albumID, "photo.jpg")

	deleted, err := DeletePhoto(db, id)
	if err != nil {
		t.Fatalf("DeletePhoto: %v", err)
	}
	if deleted.ID != id {
		t.Errorf("deleted ID: got %d, want %d", deleted.ID, id)
	}

	_, err = GetPhotoByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestDeletePhoto_ClearsCoverReference(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photoID := mustCreatePhoto(t, db, userID, albumID, "cover.jpg")

	_ = SetAlbumCover(db, albumID, photoID)
	_, _ = DeletePhoto(db, photoID)

	a, _ := GetAlbumByID(db, albumID)
	if a.CoverPhoto != nil {
		t.Error("CoverPhoto should be nil after the cover photo is deleted")
	}
}

func TestSetAlbumCover(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photoID := mustCreatePhoto(t, db, userID, albumID, "cover.jpg")

	if err := SetAlbumCover(db, albumID, photoID); err != nil {
		t.Fatalf("SetAlbumCover: %v", err)
	}
}

func TestSetAlbumCoverIfNone(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photo1 := mustCreatePhoto(t, db, userID, albumID, "first.jpg")
	photo2 := mustCreatePhoto(t, db, userID, albumID, "second.jpg")

	// Set first cover.
	_ = SetAlbumCoverIfNone(db, albumID, photo1)
	// Second call must not overwrite.
	_ = SetAlbumCoverIfNone(db, albumID, photo2)

	// Verify cover is photo1 by reading the raw column value.
	var cover sql.NullInt64
	_ = db.QueryRow(`SELECT cover_photo FROM gallery_albums WHERE id=?`, albumID).Scan(&cover)
	if cover.Int64 != photo1 {
		t.Errorf("cover should be %d, got %d", photo1, cover.Int64)
	}
}

func TestGetDefaultAlbum_CreatesOnFirstCall(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	a, err := GetDefaultAlbum(db, userID)
	if err != nil {
		t.Fatalf("GetDefaultAlbum: %v", err)
	}
	if a == nil {
		t.Fatal("expected album, got nil")
	}
	if a.Title != "Uploads" {
		t.Errorf("expected Uploads, got %q", a.Title)
	}
	if !a.IsDefault {
		t.Error("album should be marked as default")
	}
}

func TestGetDefaultAlbum_Idempotent(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	a1, _ := GetDefaultAlbum(db, userID)
	a2, _ := GetDefaultAlbum(db, userID)

	if a1.ID != a2.ID {
		t.Errorf("IDs differ: %d vs %d", a1.ID, a2.ID)
	}
}

func TestSetDefaultAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id1 := mustCreateAlbum(t, db, userID, "First", "first")
	id2 := mustCreateAlbum(t, db, userID, "Second", "second")

	_ = SetDefaultAlbum(db, id1, userID)
	_ = SetDefaultAlbum(db, id2, userID)

	a1, _ := GetAlbumByID(db, id1)
	a2, _ := GetAlbumByID(db, id2)

	if a1.IsDefault {
		t.Error("first album should no longer be the default")
	}
	if !a2.IsDefault {
		t.Error("second album should be the default")
	}
}

func TestListSubAlbums(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	parentID := mustCreateAlbum(t, db, userID, "Parent", "parent")
	childID, err := CreateAlbum(db, &Album{
		UserID:   userID,
		Title:    "Child",
		Slug:     "child",
		ParentID: &parentID,
	})
	if err != nil {
		t.Fatalf("CreateAlbum child: %v", err)
	}
	_ = childID

	subs, err := ListSubAlbums(db, parentID)
	if err != nil {
		t.Fatalf("ListSubAlbums: %v", err)
	}
	if len(subs) != 1 {
		t.Fatalf("expected 1 sub-album, got %d", len(subs))
	}
	if subs[0].Title != "Child" {
		t.Errorf("expected Child, got %q", subs[0].Title)
	}
}

func TestSetAlbumDefaultChild(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	parentID := mustCreateAlbum(t, db, userID, "Parent", "parent")
	childID, _ := CreateAlbum(db, &Album{
		UserID:   userID,
		Title:    "Child",
		Slug:     "child",
		ParentID: &parentID,
	})

	if err := SetAlbumDefaultChild(db, parentID, &childID); err != nil {
		t.Fatalf("SetAlbumDefaultChild: %v", err)
	}

	a, _ := GetAlbumByID(db, parentID)
	if a.DefaultChildID == nil || *a.DefaultChildID != childID {
		t.Errorf("DefaultChildID: got %v, want %d", a.DefaultChildID, childID)
	}
}

func TestSetAlbumDefaultChild_WrongParent(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	parent1 := mustCreateAlbum(t, db, userID, "Parent1", "parent1")
	parent2 := mustCreateAlbum(t, db, userID, "Parent2", "parent2")
	childID, _ := CreateAlbum(db, &Album{
		UserID:   userID,
		Title:    "Child",
		Slug:     "child",
		ParentID: &parent1,
	})

	// Trying to set childID as a child of parent2 must fail.
	err := SetAlbumDefaultChild(db, parent2, &childID)
	if err == nil {
		t.Error("expected error when child belongs to different parent")
	}
}

func TestListUserPhotosAll(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")

	mustCreatePhoto(t, db, userID, albumID, "a.jpg")
	mustCreatePhoto(t, db, userID, albumID, "b.jpg")

	photos, err := ListUserPhotosAll(db, userID, 10)
	if err != nil {
		t.Fatalf("ListUserPhotosAll: %v", err)
	}
	if len(photos) != 2 {
		t.Errorf("expected 2, got %d", len(photos))
	}
}

func TestListPhotoIDsInAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photoID := mustCreatePhoto(t, db, userID, albumID, "a.jpg")

	_ = AddPhotoToAlbum(db, albumID, photoID)

	ids, err := ListPhotoIDsInAlbum(db, albumID)
	if err != nil {
		t.Fatalf("ListPhotoIDsInAlbum: %v", err)
	}
	if !ids[photoID] {
		t.Errorf("expected photoID %d in set", photoID)
	}
}

func TestFindOtherAlbumForPhoto_NoOtherAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	albumID := mustCreateAlbum(t, db, userID, "Summer", "summer")
	photoID := mustCreatePhoto(t, db, userID, albumID, "a.jpg")

	_ = AddPhotoToAlbum(db, albumID, photoID)

	otherID, err := FindOtherAlbumForPhoto(db, photoID, []int64{albumID})
	if err != nil {
		t.Fatalf("FindOtherAlbumForPhoto: %v", err)
	}
	if otherID != 0 {
		t.Errorf("expected 0, got %d", otherID)
	}
}

func TestFindOtherAlbumForPhoto_HasOtherAlbum(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	album1 := mustCreateAlbum(t, db, userID, "A1", "a1")
	album2 := mustCreateAlbum(t, db, userID, "A2", "a2")
	photoID := mustCreatePhoto(t, db, userID, album1, "a.jpg")

	_ = AddPhotoToAlbum(db, album1, photoID)
	_ = AddPhotoToAlbum(db, album2, photoID)

	otherID, err := FindOtherAlbumForPhoto(db, photoID, []int64{album1})
	if err != nil {
		t.Fatalf("FindOtherAlbumForPhoto: %v", err)
	}
	if otherID != album2 {
		t.Errorf("expected %d, got %d", album2, otherID)
	}
}

func TestRehomePhoto(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	album1 := mustCreateAlbum(t, db, userID, "A1", "a1")
	album2 := mustCreateAlbum(t, db, userID, "A2", "a2")
	photoID := mustCreatePhoto(t, db, userID, album1, "a.jpg")

	if err := RehomePhoto(db, photoID, album2); err != nil {
		t.Fatalf("RehomePhoto: %v", err)
	}

	p, _ := GetPhotoByID(db, photoID)
	if p.AlbumID != album2 {
		t.Errorf("expected AlbumID %d, got %d", album2, p.AlbumID)
	}
}

func TestSearchAlbumsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id1 := mustCreateAlbum(t, db, userID, "Beach Holiday", "beach-holiday")
	_ = mustCreateAlbum(t, db, userID, "Mountains", "mountains")
	_ = SetAlbumPublished(db, id1, true)

	results, err := SearchAlbumsByUser(db, userID, "Beach")
	if err != nil {
		t.Fatalf("SearchAlbumsByUser: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 result, got %d", len(results))
	}
	if results[0].Title != "Beach Holiday" {
		t.Errorf("unexpected title: %q", results[0].Title)
	}
}

func TestListAllPhotosByAlbum_IncludesSubAlbumPhotos(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	parentID := mustCreateAlbum(t, db, userID, "Parent", "parent")
	childID, _ := CreateAlbum(db, &Album{
		UserID:   userID,
		Title:    "Child",
		Slug:     "child",
		ParentID: &parentID,
	})

	p1 := mustCreatePhoto(t, db, userID, parentID, "parent-photo.jpg")
	p2 := mustCreatePhoto(t, db, userID, childID, "child-photo.jpg")

	_ = AddPhotoToAlbum(db, parentID, p1)
	_ = AddPhotoToAlbum(db, childID, p2)

	photos, err := ListAllPhotosByAlbum(db, parentID)
	if err != nil {
		t.Fatalf("ListAllPhotosByAlbum: %v", err)
	}
	if len(photos) != 2 {
		t.Errorf("expected 2 photos (parent + child album), got %d", len(photos))
	}
}
