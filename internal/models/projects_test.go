package models

import (
	"database/sql"
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

func mustCreateProject(t *testing.T, db *sql.DB, userID int64, title, slug string, published bool) int64 {
	t.Helper()
	id, err := CreateProject(db, &Project{
		UserID:    userID,
		Title:     title,
		Slug:      slug,
		Published: published,
	})
	if err != nil {
		t.Fatalf("mustCreateProject(%q): %v", title, err)
	}
	return id
}

func TestCreateProject_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, err := CreateProject(db, &Project{
		UserID:    userID,
		Title:     "My Project",
		Slug:      "my-project",
		Published: true,
	})
	if err != nil {
		t.Fatalf("CreateProject: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestGetProjectByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateProject(t, db, userID, "My Project", "my-project", true)

	p, err := GetProjectByID(db, id)
	if err != nil {
		t.Fatalf("GetProjectByID: %v", err)
	}
	if p.Title != "My Project" {
		t.Errorf("expected My Project, got %q", p.Title)
	}
}

func TestGetProjectByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetProjectByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetProjectBySlug(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	mustCreateProject(t, db, userID, "My Project", "my-project", true)

	p, err := GetProjectBySlug(db, userID, "my-project")
	if err != nil {
		t.Fatalf("GetProjectBySlug: %v", err)
	}
	if p.Slug != "my-project" {
		t.Errorf("expected my-project, got %q", p.Slug)
	}
}

func TestGetProjectBySlug_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	_, err := GetProjectBySlug(db, userID, "nonexistent")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestListProjectsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreateProject(t, db, userID, "Published", "published", true)
	mustCreateProject(t, db, userID, "Draft", "draft", false)

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
			projects, err := ListProjectsByUser(db, userID, tc.publishedOnly)
			if err != nil {
				t.Fatalf("ListProjectsByUser: %v", err)
			}
			if len(projects) != tc.wantCount {
				t.Errorf("expected %d, got %d", tc.wantCount, len(projects))
			}
		})
	}
}

func TestListProjectsByUser_OwnProjectsOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	id1 := mustCreateUser(t, db, "alice")
	id2 := mustCreateUser(t, db, "bob")

	mustCreateProject(t, db, id1, "Alice Project", "alice-proj", true)
	mustCreateProject(t, db, id2, "Bob Project", "bob-proj", true)

	projects, err := ListProjectsByUser(db, id1, false)
	if err != nil {
		t.Fatalf("ListProjectsByUser: %v", err)
	}
	if len(projects) != 1 {
		t.Fatalf("expected 1, got %d", len(projects))
	}
	if projects[0].UserID != id1 {
		t.Errorf("project belongs to wrong user")
	}
}

func TestUpdateProject(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateProject(t, db, userID, "Old", "old", false)

	p, _ := GetProjectByID(db, id)
	p.Title = "New"
	p.Slug = "new"
	p.Published = true
	p.Description = "Updated description"

	if err := UpdateProject(db, p); err != nil {
		t.Fatalf("UpdateProject: %v", err)
	}

	updated, _ := GetProjectByID(db, id)
	if updated.Title != "New" {
		t.Errorf("Title: got %q, want New", updated.Title)
	}
	if !updated.Published {
		t.Error("Published should be true")
	}
}

func TestSetProjectPublished(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateProject(t, db, userID, "Draft", "draft", false)

	if err := SetProjectPublished(db, id, true); err != nil {
		t.Fatalf("SetProjectPublished: %v", err)
	}

	p, _ := GetProjectByID(db, id)
	if !p.Published {
		t.Error("project should be published")
	}
}

func TestDeleteProject(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateProject(t, db, userID, "My Project", "my-project", true)

	deleted, err := DeleteProject(db, id)
	if err != nil {
		t.Fatalf("DeleteProject: %v", err)
	}
	if deleted.ID != id {
		t.Errorf("returned wrong ID: got %d, want %d", deleted.ID, id)
	}

	_, err = GetProjectByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestDeleteProject_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := DeleteProject(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestSearchProjectsByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreateProject(t, db, userID, "Machine Learning Tool", "ml-tool", true)
	mustCreateProject(t, db, userID, "Web Scraper", "web-scraper", true)
	mustCreateProject(t, db, userID, "ML Draft", "ml-draft", false)

	results, err := SearchProjectsByUser(db, userID, "Machine")
	if err != nil {
		t.Fatalf("SearchProjectsByUser: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 result, got %d", len(results))
	}
}

func TestSetLinkedPosts(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	projectID := mustCreateProject(t, db, userID, "My Project", "my-project", true)
	postID := mustCreatePost(t, db, userID, "My Post", "my-post", true)

	if err := SetLinkedPosts(db, projectID, userID, []int64{postID}); err != nil {
		t.Fatalf("SetLinkedPosts: %v", err)
	}

	p, _ := GetProjectByID(db, projectID)
	if len(p.LinkedPosts) != 1 {
		t.Fatalf("expected 1 linked post, got %d", len(p.LinkedPosts))
	}
	if p.LinkedPosts[0].ID != postID {
		t.Errorf("linked post ID: got %d, want %d", p.LinkedPosts[0].ID, postID)
	}
}

func TestSetLinkedPosts_IgnoresOtherUsersPost(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID1 := mustCreateUser(t, db, "alice")
	userID2 := mustCreateUser(t, db, "bob")
	projectID := mustCreateProject(t, db, userID1, "Alice Project", "alice-project", true)
	bobPostID := mustCreatePost(t, db, userID2, "Bob Post", "bob-post", true)

	// Attempting to link a post owned by another user must be silently ignored.
	if err := SetLinkedPosts(db, projectID, userID1, []int64{bobPostID}); err != nil {
		t.Fatalf("SetLinkedPosts: %v", err)
	}

	p, _ := GetProjectByID(db, projectID)
	if len(p.LinkedPosts) != 0 {
		t.Errorf("expected 0 linked posts (cross-user), got %d", len(p.LinkedPosts))
	}
}

func TestSetLinkedPosts_ClearsOldLinks(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	projectID := mustCreateProject(t, db, userID, "My Project", "my-project", true)
	post1 := mustCreatePost(t, db, userID, "Post 1", "post-1", true)
	post2 := mustCreatePost(t, db, userID, "Post 2", "post-2", true)

	_ = SetLinkedPosts(db, projectID, userID, []int64{post1, post2})
	_ = SetLinkedPosts(db, projectID, userID, []int64{post1})

	p, _ := GetProjectByID(db, projectID)
	if len(p.LinkedPosts) != 1 {
		t.Errorf("expected 1 linked post after replacement, got %d", len(p.LinkedPosts))
	}
}

func TestListLinkedPosts_Empty(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	projectID := mustCreateProject(t, db, userID, "My Project", "my-project", true)

	posts, err := ListLinkedPosts(db, projectID)
	if err != nil {
		t.Fatalf("ListLinkedPosts: %v", err)
	}
	if len(posts) != 0 {
		t.Errorf("expected 0, got %d", len(posts))
	}
}
