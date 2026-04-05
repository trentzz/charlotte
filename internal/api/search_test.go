package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/trentzz/charlotte/internal/models"
)

// TestSearchEmptyQuery verifies that a missing or too-short query returns an
// empty results array rather than an error.
func TestSearchEmptyQuery(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/u/{username}/search", app.PublicSearch)

	for _, q := range []string{"", "a"} {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/u/alice/search?q="+q, nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		assertStatus(t, rec, http.StatusOK)

		var data map[string]any
		decodeData(t, rec, &data)

		results, ok := data["results"].([]any)
		if !ok {
			t.Errorf("q=%q: results not an array: %v", q, data)
			continue
		}
		if len(results) != 0 {
			t.Errorf("q=%q: expected empty results, got %d", q, len(results))
		}
	}
}

// TestSearchUnknownUser verifies that searching for an unknown user returns 404.
func TestSearchUnknownUser(t *testing.T) {
	app, _ := newApp(t)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/u/{username}/search", app.PublicSearch)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/nobody/search?q=hello", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusNotFound)
}

// TestSearchFindsPost verifies that a published blog post is returned when its
// title matches the query.
func TestSearchFindsPost(t *testing.T) {
	app, db := newApp(t)
	alice := createUser(t, db, "alice", "hunter12")

	// Create a published post.
	_, err := models.CreatePost(db, &models.Post{
		UserID:    alice.ID,
		Title:     "Hello World Post",
		Slug:      "hello-world-post",
		Body:      "This is the body of the post.",
		Published: true,
		Tags:      []string{},
	})
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/u/{username}/search", app.PublicSearch)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/alice/search?q=hello+world", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	results, ok := data["results"].([]any)
	if !ok {
		t.Fatalf("results not an array: %v", data)
	}
	if len(results) == 0 {
		t.Fatal("expected at least one result, got none")
	}

	first, ok := results[0].(map[string]any)
	if !ok {
		t.Fatalf("result not an object: %v", results[0])
	}
	if first["type"] != "blog" {
		t.Errorf("type = %v, want blog", first["type"])
	}
	if first["title"] != "Hello World Post" {
		t.Errorf("title = %v, want 'Hello World Post'", first["title"])
	}
}

// TestSearchResultShape verifies the shape of each result object.
func TestSearchResultShape(t *testing.T) {
	app, db := newApp(t)
	alice := createUser(t, db, "alice", "hunter12")

	_, _ = models.CreatePost(db, &models.Post{
		UserID:    alice.ID,
		Title:     "Unique query target",
		Slug:      "unique-query-target",
		Body:      "Some body text.",
		Published: true,
		Tags:      []string{},
	})

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/u/{username}/search", app.PublicSearch)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/alice/search?q=unique", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	results, _ := data["results"].([]any)
	if len(results) == 0 {
		t.Fatal("expected results")
	}

	item, _ := results[0].(map[string]any)
	for _, field := range []string{"type", "title", "slug", "description"} {
		if _, ok := item[field]; !ok {
			t.Errorf("result missing field %q", field)
		}
	}
}
