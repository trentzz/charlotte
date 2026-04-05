package models

import (
	"database/sql"
	"testing"
	"time"

	"github.com/trentzz/charlotte/internal/testutil"
)

func mustCreateEntry(t *testing.T, db *sql.DB, pageID, userID int64, title string) int64 {
	t.Helper()
	id, err := CreateEntry(db, &CustomPageEntry{
		PageID: pageID,
		UserID: userID,
		Title:  title,
		Status: "active",
	})
	if err != nil {
		t.Fatalf("mustCreateEntry(%q): %v", title, err)
	}
	return id
}

func TestCreateEntry_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)

	id, err := CreateEntry(db, &CustomPageEntry{
		PageID: pageID,
		UserID: userID,
		Title:  "Entry One",
		Status: "active",
	})
	if err != nil {
		t.Fatalf("CreateEntry: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestCreateEntry_WithEntryDate(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)

	ts := time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)
	id, err := CreateEntry(db, &CustomPageEntry{
		PageID:    pageID,
		UserID:    userID,
		Title:     "Dated Entry",
		Status:    "active",
		EntryDate: &ts,
	})
	if err != nil {
		t.Fatalf("CreateEntry with date: %v", err)
	}

	e, err := GetEntryByID(db, id)
	if err != nil {
		t.Fatalf("GetEntryByID: %v", err)
	}
	if e.EntryDate == nil {
		t.Fatal("expected EntryDate to be set")
	}
	if e.EntryDate.Unix() != ts.Unix() {
		t.Errorf("EntryDate: got %v, want %v", e.EntryDate, ts)
	}
}

func TestGetEntryByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)
	id := mustCreateEntry(t, db, pageID, userID, "Entry One")

	e, err := GetEntryByID(db, id)
	if err != nil {
		t.Fatalf("GetEntryByID: %v", err)
	}
	if e.Title != "Entry One" {
		t.Errorf("expected Entry One, got %q", e.Title)
	}
}

func TestGetEntryByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetEntryByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestListEntriesByPage(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)

	mustCreateEntry(t, db, pageID, userID, "A")
	mustCreateEntry(t, db, pageID, userID, "B")

	entries, err := ListEntriesByPage(db, pageID)
	if err != nil {
		t.Fatalf("ListEntriesByPage: %v", err)
	}
	if len(entries) != 2 {
		t.Errorf("expected 2 entries, got %d", len(entries))
	}
}

func TestListEntriesByPage_Empty(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)

	entries, err := ListEntriesByPage(db, pageID)
	if err != nil {
		t.Fatalf("ListEntriesByPage: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("expected 0 entries, got %d", len(entries))
	}
}

func TestListEntriesByPage_SortOrder(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)

	_, _ = CreateEntry(db, &CustomPageEntry{PageID: pageID, UserID: userID, Title: "Third", SortOrder: 3})
	_, _ = CreateEntry(db, &CustomPageEntry{PageID: pageID, UserID: userID, Title: "First", SortOrder: 1})
	_, _ = CreateEntry(db, &CustomPageEntry{PageID: pageID, UserID: userID, Title: "Second", SortOrder: 2})

	entries, _ := ListEntriesByPage(db, pageID)
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}
	if entries[0].Title != "First" {
		t.Errorf("expected First first, got %q", entries[0].Title)
	}
	if entries[1].Title != "Second" {
		t.Errorf("expected Second second, got %q", entries[1].Title)
	}
}

func TestUpdateEntry(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)
	id := mustCreateEntry(t, db, pageID, userID, "Old Title")

	e, _ := GetEntryByID(db, id)
	e.Title = "New Title"
	e.Rating = 5
	e.Status = "done"
	e.FieldsJSON = `{"note":"updated"}`

	if err := UpdateEntry(db, e); err != nil {
		t.Fatalf("UpdateEntry: %v", err)
	}

	updated, _ := GetEntryByID(db, id)
	if updated.Title != "New Title" {
		t.Errorf("Title: got %q, want New Title", updated.Title)
	}
	if updated.Rating != 5 {
		t.Errorf("Rating: got %d, want 5", updated.Rating)
	}
	if updated.Status != "done" {
		t.Errorf("Status: got %q, want done", updated.Status)
	}
}

func TestUpdateEntry_WrongUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	owner := mustCreateUser(t, db, "alice")
	other := mustCreateUser(t, db, "bob")
	pageID := mustCreateCustomPage(t, db, owner, "my-page", true)
	id := mustCreateEntry(t, db, pageID, owner, "Original")

	e, _ := GetEntryByID(db, id)
	e.UserID = other
	e.Title = "Tampered"
	_ = UpdateEntry(db, e)

	// Original owner's entry should be unchanged.
	unchanged, _ := GetEntryByID(db, id)
	if unchanged.Title != "Original" {
		t.Errorf("entry was modified by wrong user; title is %q", unchanged.Title)
	}
}

func TestDeleteEntry(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)
	id := mustCreateEntry(t, db, pageID, userID, "Entry")

	if err := DeleteEntry(db, id, userID); err != nil {
		t.Fatalf("DeleteEntry: %v", err)
	}

	_, err := GetEntryByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestDeleteEntry_WrongUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	owner := mustCreateUser(t, db, "alice")
	other := mustCreateUser(t, db, "bob")
	pageID := mustCreateCustomPage(t, db, owner, "my-page", true)
	id := mustCreateEntry(t, db, pageID, owner, "Entry")

	_ = DeleteEntry(db, id, other)

	_, err := GetEntryByID(db, id)
	if err != nil {
		t.Errorf("entry should still exist; got %v", err)
	}
}

func TestDeleteCustomPage_CascadesEntries(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	pageID := mustCreateCustomPage(t, db, userID, "my-page", true)
	id := mustCreateEntry(t, db, pageID, userID, "Entry")

	_ = DeleteCustomPage(db, pageID, userID)

	// Entry should be gone via cascade.
	_, err := GetEntryByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after page cascade delete, got %v", err)
	}
}
