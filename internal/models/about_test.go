package models

import (
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

func TestGetAboutPage_NoneExists(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	a, err := GetAboutPage(db, userID)
	if err != nil {
		t.Fatalf("GetAboutPage (none): %v", err)
	}
	if a != nil {
		t.Errorf("expected nil when no about page exists, got %+v", a)
	}
}

func TestUpsertAboutPage_Create(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	if err := UpsertAboutPage(db, userID, "Hello, I am Alice."); err != nil {
		t.Fatalf("UpsertAboutPage (create): %v", err)
	}

	a, err := GetAboutPage(db, userID)
	if err != nil {
		t.Fatalf("GetAboutPage after upsert: %v", err)
	}
	if a == nil {
		t.Fatal("expected about page, got nil")
	}
	if a.Content != "Hello, I am Alice." {
		t.Errorf("Content: got %q, want %q", a.Content, "Hello, I am Alice.")
	}
	if a.UserID != userID {
		t.Errorf("UserID: got %d, want %d", a.UserID, userID)
	}
}

func TestUpsertAboutPage_Update(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	_ = UpsertAboutPage(db, userID, "First version")
	if err := UpsertAboutPage(db, userID, "Second version"); err != nil {
		t.Fatalf("UpsertAboutPage (update): %v", err)
	}

	a, _ := GetAboutPage(db, userID)
	if a.Content != "Second version" {
		t.Errorf("Content after update: got %q, want Second version", a.Content)
	}
}

func TestGetAboutPage_IsolatedByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	id1 := mustCreateUser(t, db, "alice")
	id2 := mustCreateUser(t, db, "bob")

	_ = UpsertAboutPage(db, id1, "Alice's about page")

	// Bob has no about page.
	a, err := GetAboutPage(db, id2)
	if err != nil {
		t.Fatalf("GetAboutPage for bob: %v", err)
	}
	if a != nil {
		t.Errorf("expected nil for bob, got %+v", a)
	}
}

func TestUpsertAboutPage_EmptyContent(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	if err := UpsertAboutPage(db, userID, ""); err != nil {
		t.Fatalf("UpsertAboutPage empty content: %v", err)
	}

	a, _ := GetAboutPage(db, userID)
	if a == nil {
		t.Fatal("expected about page even with empty content")
	}
	if a.Content != "" {
		t.Errorf("Content: got %q, want empty", a.Content)
	}
}

func TestUpsertAboutPage_MultipleUsers(t *testing.T) {
	db := testutil.NewTestDB(t)
	id1 := mustCreateUser(t, db, "alice")
	id2 := mustCreateUser(t, db, "bob")

	_ = UpsertAboutPage(db, id1, "Alice content")
	_ = UpsertAboutPage(db, id2, "Bob content")

	a1, _ := GetAboutPage(db, id1)
	a2, _ := GetAboutPage(db, id2)

	if a1.Content != "Alice content" {
		t.Errorf("alice: got %q", a1.Content)
	}
	if a2.Content != "Bob content" {
		t.Errorf("bob: got %q", a2.Content)
	}
}
