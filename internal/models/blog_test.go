package models

import (
	"database/sql"
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

func mustCreatePost(t *testing.T, db *sql.DB, userID int64, title, slug string, published bool) int64 {
	t.Helper()
	p := &Post{
		UserID:    userID,
		Title:     title,
		Slug:      slug,
		Body:      "Post body for " + title,
		Published: published,
	}
	id, err := CreatePost(db, p)
	if err != nil {
		t.Fatalf("mustCreatePost(%q): %v", title, err)
	}
	return id
}

func TestCreatePost_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, err := CreatePost(db, &Post{
		UserID:    userID,
		Title:     "Hello World",
		Slug:      "hello-world",
		Body:      "Content",
		Published: true,
	})
	if err != nil {
		t.Fatalf("CreatePost: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestCreatePost_WithTags(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, err := CreatePost(db, &Post{
		UserID:    userID,
		Title:     "Tagged Post",
		Slug:      "tagged-post",
		Body:      "Content",
		Published: true,
		Tags:      []string{"go", "testing", "Go"}, // "Go" should normalise to "go"
	})
	if err != nil {
		t.Fatalf("CreatePost with tags: %v", err)
	}

	tags, err := GetPostTags(db, id)
	if err != nil {
		t.Fatalf("GetPostTags: %v", err)
	}
	// Expect exactly two unique tags (go, testing).
	if len(tags) != 2 {
		t.Errorf("expected 2 unique tags, got %d: %v", len(tags), tags)
	}
}

func TestGetPostBySlug(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	mustCreatePost(t, db, userID, "Hello", "hello", true)

	p, err := GetPostBySlug(db, userID, "hello")
	if err != nil {
		t.Fatalf("GetPostBySlug: %v", err)
	}
	if p.Title != "Hello" {
		t.Errorf("expected Hello, got %q", p.Title)
	}
}

func TestGetPostBySlug_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	_, err := GetPostBySlug(db, userID, "nonexistent")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetPostByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreatePost(t, db, userID, "Hello", "hello", true)

	p, err := GetPostByID(db, id)
	if err != nil {
		t.Fatalf("GetPostByID: %v", err)
	}
	if p.ID != id {
		t.Errorf("expected ID %d, got %d", id, p.ID)
	}
}

func TestGetPostByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetPostByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestListPostsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreatePost(t, db, userID, "Published", "published", true)
	mustCreatePost(t, db, userID, "Draft", "draft", false)

	tests := []struct {
		name          string
		publishedOnly bool
		wantCount     int
	}{
		{"all posts", false, 2},
		{"published only", true, 1},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			posts, err := ListPostsByUser(db, userID, tc.publishedOnly)
			if err != nil {
				t.Fatalf("ListPostsByUser: %v", err)
			}
			if len(posts) != tc.wantCount {
				t.Errorf("expected %d posts, got %d", tc.wantCount, len(posts))
			}
		})
	}
}

func TestListPostsByUser_OnlyOwnPosts(t *testing.T) {
	db := testutil.NewTestDB(t)
	id1 := mustCreateUser(t, db, "alice")
	id2 := mustCreateUser(t, db, "bob")

	mustCreatePost(t, db, id1, "Alice Post", "alice-post", true)
	mustCreatePost(t, db, id2, "Bob Post", "bob-post", true)

	posts, err := ListPostsByUser(db, id1, false)
	if err != nil {
		t.Fatalf("ListPostsByUser: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("expected 1 post for alice, got %d", len(posts))
	}
	if posts[0].UserID != id1 {
		t.Errorf("post belongs to wrong user: %d", posts[0].UserID)
	}
}

func TestUpdatePost(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreatePost(t, db, userID, "Old Title", "old-title", false)

	p, _ := GetPostByID(db, id)
	p.Title = "New Title"
	p.Slug = "new-title"
	p.Published = true
	p.Tags = []string{"updated"}

	if err := UpdatePost(db, p); err != nil {
		t.Fatalf("UpdatePost: %v", err)
	}

	updated, _ := GetPostByID(db, id)
	if updated.Title != "New Title" {
		t.Errorf("Title: got %q, want New Title", updated.Title)
	}
	if !updated.Published {
		t.Error("Published should be true")
	}
	if len(updated.Tags) != 1 || updated.Tags[0] != "updated" {
		t.Errorf("Tags: got %v", updated.Tags)
	}
}

func TestDeletePost(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreatePost(t, db, userID, "Hello", "hello", true)

	if err := DeletePost(db, id); err != nil {
		t.Fatalf("DeletePost: %v", err)
	}

	_, err := GetPostByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestDeletePost_CascadesTagLinks(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, _ := CreatePost(db, &Post{
		UserID:    userID,
		Title:     "Tagged",
		Slug:      "tagged",
		Body:      "body",
		Published: true,
		Tags:      []string{"go"},
	})

	_ = DeletePost(db, id)

	// Tag links should be gone; the tag row itself may remain (that is fine).
	tags, err := GetPostTags(db, id)
	if err != nil {
		t.Fatalf("GetPostTags after delete: %v", err)
	}
	if len(tags) != 0 {
		t.Errorf("expected no tags after post deletion, got %v", tags)
	}
}

func TestUpsertTags_ReplacesExisting(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreatePost(t, db, userID, "Post", "post", true)

	_ = UpsertTags(db, id, []string{"a", "b", "c"})
	_ = UpsertTags(db, id, []string{"x", "y"})

	tags, _ := GetPostTags(db, id)
	if len(tags) != 2 {
		t.Errorf("expected 2 tags after upsert, got %d: %v", len(tags), tags)
	}
}

func TestGetPostTags_NoTags(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreatePost(t, db, userID, "Untagged", "untagged", true)

	tags, err := GetPostTags(db, id)
	if err != nil {
		t.Fatalf("GetPostTags: %v", err)
	}
	if len(tags) != 0 {
		t.Errorf("expected no tags, got %v", tags)
	}
}

func TestSearchPostsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreatePost(t, db, userID, "Go Programming", "go-programming", true)
	mustCreatePost(t, db, userID, "Python Tips", "python-tips", true)
	mustCreatePost(t, db, userID, "Draft Go Post", "draft-go", false)

	results, err := SearchPostsByUser(db, userID, "Go")
	if err != nil {
		t.Fatalf("SearchPostsByUser: %v", err)
	}
	// Draft post must not appear; only published posts match.
	if len(results) != 1 {
		t.Errorf("expected 1 result, got %d", len(results))
	}
	if results[0].Title != "Go Programming" {
		t.Errorf("unexpected result: %q", results[0].Title)
	}
}

func TestSearchPostsByUser_NoResults(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	results, err := SearchPostsByUser(db, userID, "nonexistent")
	if err != nil {
		t.Fatalf("SearchPostsByUser: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected empty result, got %d", len(results))
	}
}
