package models

import (
	"database/sql"
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

func mustCreateCustomPage(t *testing.T, db *sql.DB, userID int64, slug string, published bool) int64 {
	t.Helper()
	id, err := CreateCustomPage(db, &CustomPage{
		UserID:    userID,
		Kind:      "list",
		Format:    "list",
		Slug:      slug,
		Title:     "Page " + slug,
		Published: published,
	})
	if err != nil {
		t.Fatalf("mustCreateCustomPage(%q): %v", slug, err)
	}
	return id
}

func TestCreateCustomPage_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, err := CreateCustomPage(db, &CustomPage{
		UserID:    userID,
		Kind:      "list",
		Format:    "freeform",
		Slug:      "my-page",
		Title:     "My Page",
		Published: true,
	})
	if err != nil {
		t.Fatalf("CreateCustomPage: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestGetCustomPageByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateCustomPage(t, db, userID, "my-page", true)

	p, err := GetCustomPageByID(db, id)
	if err != nil {
		t.Fatalf("GetCustomPageByID: %v", err)
	}
	if p.Slug != "my-page" {
		t.Errorf("expected my-page, got %q", p.Slug)
	}
}

func TestGetCustomPageByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetCustomPageByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetCustomPageBySlug(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	mustCreateCustomPage(t, db, userID, "my-page", true)

	p, err := GetCustomPageBySlug(db, userID, "my-page")
	if err != nil {
		t.Fatalf("GetCustomPageBySlug: %v", err)
	}
	if p.Slug != "my-page" {
		t.Errorf("expected my-page, got %q", p.Slug)
	}
}

func TestGetCustomPageBySlug_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	_, err := GetCustomPageBySlug(db, userID, "nonexistent")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestListCustomPagesByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreateCustomPage(t, db, userID, "published-page", true)
	mustCreateCustomPage(t, db, userID, "private-page", false)

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
			pages, err := ListCustomPagesByUser(db, userID, tc.publishedOnly)
			if err != nil {
				t.Fatalf("ListCustomPagesByUser: %v", err)
			}
			if len(pages) != tc.wantCount {
				t.Errorf("expected %d, got %d", tc.wantCount, len(pages))
			}
		})
	}
}

func TestListCustomPagesByUser_OwnPagesOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	id1 := mustCreateUser(t, db, "alice")
	id2 := mustCreateUser(t, db, "bob")

	mustCreateCustomPage(t, db, id1, "alice-page", true)
	mustCreateCustomPage(t, db, id2, "bob-page", true)

	pages, err := ListCustomPagesByUser(db, id1, false)
	if err != nil {
		t.Fatalf("ListCustomPagesByUser: %v", err)
	}
	if len(pages) != 1 {
		t.Fatalf("expected 1, got %d", len(pages))
	}
	if pages[0].UserID != id1 {
		t.Error("page belongs to wrong user")
	}
}

func TestUpdateCustomPage(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateCustomPage(t, db, userID, "my-page", false)

	p, _ := GetCustomPageByID(db, id)
	p.Title = "Updated Title"
	p.Published = true
	p.Body = "Some content"

	if err := UpdateCustomPage(db, p); err != nil {
		t.Fatalf("UpdateCustomPage: %v", err)
	}

	updated, _ := GetCustomPageByID(db, id)
	if updated.Title != "Updated Title" {
		t.Errorf("Title: got %q, want Updated Title", updated.Title)
	}
	if !updated.Published {
		t.Error("Published should be true")
	}
}

func TestToggleCustomPagePublished(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateCustomPage(t, db, userID, "my-page", false)

	// Toggle to published.
	if err := ToggleCustomPagePublished(db, id, userID); err != nil {
		t.Fatalf("ToggleCustomPagePublished: %v", err)
	}
	p, _ := GetCustomPageByID(db, id)
	if !p.Published {
		t.Error("expected published=true after toggle")
	}

	// Toggle back.
	_ = ToggleCustomPagePublished(db, id, userID)
	p, _ = GetCustomPageByID(db, id)
	if p.Published {
		t.Error("expected published=false after second toggle")
	}
}

func TestToggleCustomPagePublished_WrongUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	owner := mustCreateUser(t, db, "alice")
	other := mustCreateUser(t, db, "bob")
	id := mustCreateCustomPage(t, db, owner, "my-page", false)

	// The toggle must not affect pages owned by a different user.
	_ = ToggleCustomPagePublished(db, id, other)
	p, _ := GetCustomPageByID(db, id)
	if p.Published {
		t.Error("toggle from wrong user must not change published state")
	}
}

func TestDeleteCustomPage(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateCustomPage(t, db, userID, "my-page", true)

	if err := DeleteCustomPage(db, id, userID); err != nil {
		t.Fatalf("DeleteCustomPage: %v", err)
	}

	_, err := GetCustomPageByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestDeleteCustomPage_WrongUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	owner := mustCreateUser(t, db, "alice")
	other := mustCreateUser(t, db, "bob")
	id := mustCreateCustomPage(t, db, owner, "my-page", true)

	// Delete with wrong user ID must leave the page in place.
	_ = DeleteCustomPage(db, id, other)

	_, err := GetCustomPageByID(db, id)
	if err != nil {
		t.Errorf("page should still exist; got error %v", err)
	}
}
