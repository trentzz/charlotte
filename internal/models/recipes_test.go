package models

import (
	"database/sql"
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

func mustCreateRecipe(t *testing.T, db *sql.DB, userID int64, title, slug string, published bool) int64 {
	t.Helper()
	id, err := CreateRecipe(db, &Recipe{
		UserID:    userID,
		Title:     title,
		Slug:      slug,
		Published: published,
	})
	if err != nil {
		t.Fatalf("mustCreateRecipe(%q): %v", title, err)
	}
	return id
}

func TestCreateRecipe_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	id, err := CreateRecipe(db, &Recipe{
		UserID:    userID,
		Title:     "Chocolate Cake",
		Slug:      "chocolate-cake",
		Published: true,
		IngredientsGroups: []IngredientGroup{
			{Title: "Dry", Items: []string{"flour", "sugar"}},
		},
		MethodGroups: []MethodGroup{
			{Title: "", Steps: []MethodStep{{Text: "Mix"}, {Text: "Bake"}}},
		},
	})
	if err != nil {
		t.Fatalf("CreateRecipe: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestGetRecipeBySlug(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	mustCreateRecipe(t, db, userID, "Chocolate Cake", "chocolate-cake", true)

	r, err := GetRecipeBySlug(db, userID, "chocolate-cake")
	if err != nil {
		t.Fatalf("GetRecipeBySlug: %v", err)
	}
	if r.Title != "Chocolate Cake" {
		t.Errorf("expected Chocolate Cake, got %q", r.Title)
	}
}

func TestGetRecipeBySlug_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	_, err := GetRecipeBySlug(db, userID, "nonexistent")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetRecipeByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateRecipe(t, db, userID, "Chocolate Cake", "chocolate-cake", true)

	r, err := GetRecipeByID(db, id)
	if err != nil {
		t.Fatalf("GetRecipeByID: %v", err)
	}
	if r.ID != id {
		t.Errorf("expected ID %d, got %d", id, r.ID)
	}
}

func TestGetRecipeByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetRecipeByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestListRecipesByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreateRecipe(t, db, userID, "Published", "published-recipe", true)
	mustCreateRecipe(t, db, userID, "Draft", "draft-recipe", false)

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
			recipes, err := ListRecipesByUser(db, userID, tc.publishedOnly)
			if err != nil {
				t.Fatalf("ListRecipesByUser: %v", err)
			}
			if len(recipes) != tc.wantCount {
				t.Errorf("expected %d, got %d", tc.wantCount, len(recipes))
			}
		})
	}
}

func TestListRecipesByUser_OwnOnly(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID1 := mustCreateUser(t, db, "alice")
	userID2 := mustCreateUser(t, db, "bob")

	mustCreateRecipe(t, db, userID1, "Alice Recipe", "alice-recipe", true)
	mustCreateRecipe(t, db, userID2, "Bob Recipe", "bob-recipe", true)

	recipes, err := ListRecipesByUser(db, userID1, false)
	if err != nil {
		t.Fatalf("ListRecipesByUser: %v", err)
	}
	if len(recipes) != 1 {
		t.Fatalf("expected 1, got %d", len(recipes))
	}
	if recipes[0].UserID != userID1 {
		t.Error("recipe belongs to wrong user")
	}
}

func TestUpdateRecipe(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateRecipe(t, db, userID, "Old Title", "old-title", false)

	r, _ := GetRecipeByID(db, id)
	r.Title = "New Title"
	r.Slug = "new-title"
	r.Published = true
	r.IngredientsGroups = []IngredientGroup{{Items: []string{"butter"}}}

	if err := UpdateRecipe(db, r); err != nil {
		t.Fatalf("UpdateRecipe: %v", err)
	}

	updated, _ := GetRecipeByID(db, id)
	if updated.Title != "New Title" {
		t.Errorf("Title: got %q, want New Title", updated.Title)
	}
	if !updated.Published {
		t.Error("Published should be true")
	}
	if len(updated.IngredientsGroups) != 1 {
		t.Errorf("IngredientsGroups: expected 1 group, got %d", len(updated.IngredientsGroups))
	}
}

func TestSetRecipePublished(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateRecipe(t, db, userID, "Draft", "draft", false)

	if err := SetRecipePublished(db, id, true); err != nil {
		t.Fatalf("SetRecipePublished: %v", err)
	}

	r, _ := GetRecipeByID(db, id)
	if !r.Published {
		t.Error("recipe should be published")
	}
}

func TestDeleteRecipe(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateRecipe(t, db, userID, "Old", "old", true)

	if err := DeleteRecipe(db, id); err != nil {
		t.Fatalf("DeleteRecipe: %v", err)
	}

	_, err := GetRecipeByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestAddAttempt_ListAttemptsByRecipe(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	recipeID := mustCreateRecipe(t, db, userID, "Cake", "cake", true)

	attemptID, err := AddAttempt(db, &Attempt{
		RecipeID: recipeID,
		UserID:   userID,
		Title:    "First attempt",
		Notes:    "Turned out great",
	})
	if err != nil {
		t.Fatalf("AddAttempt: %v", err)
	}
	if attemptID <= 0 {
		t.Fatalf("expected positive ID, got %d", attemptID)
	}

	attempts, err := ListAttemptsByRecipe(db, recipeID)
	if err != nil {
		t.Fatalf("ListAttemptsByRecipe: %v", err)
	}
	if len(attempts) != 1 {
		t.Fatalf("expected 1 attempt, got %d", len(attempts))
	}
	if attempts[0].Title != "First attempt" {
		t.Errorf("Title: got %q", attempts[0].Title)
	}
}

func TestDeleteAttempt(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	recipeID := mustCreateRecipe(t, db, userID, "Cake", "cake", true)

	aID, _ := AddAttempt(db, &Attempt{RecipeID: recipeID, UserID: userID, Title: "Attempt"})

	if err := DeleteAttempt(db, aID, recipeID); err != nil {
		t.Fatalf("DeleteAttempt: %v", err)
	}

	attempts, _ := ListAttemptsByRecipe(db, recipeID)
	if len(attempts) != 0 {
		t.Errorf("expected 0 attempts after delete, got %d", len(attempts))
	}
}

func TestDeleteAttempt_WrongRecipe(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	r1 := mustCreateRecipe(t, db, userID, "Cake", "cake", true)
	r2 := mustCreateRecipe(t, db, userID, "Soup", "soup", true)

	aID, _ := AddAttempt(db, &Attempt{RecipeID: r1, UserID: userID, Title: "Attempt"})

	// Wrong recipe — delete must silently do nothing.
	_ = DeleteAttempt(db, aID, r2)

	attempts, _ := ListAttemptsByRecipe(db, r1)
	if len(attempts) != 1 {
		t.Error("attempt should not be deleted when wrong recipe ID is supplied")
	}
}

func TestListAttemptsByRecipes_Batch(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	r1 := mustCreateRecipe(t, db, userID, "Cake", "cake", true)
	r2 := mustCreateRecipe(t, db, userID, "Soup", "soup", true)

	_, _ = AddAttempt(db, &Attempt{RecipeID: r1, UserID: userID, Title: "Cake Attempt"})
	_, _ = AddAttempt(db, &Attempt{RecipeID: r2, UserID: userID, Title: "Soup Attempt"})

	result, err := ListAttemptsByRecipes(db, []int64{r1, r2})
	if err != nil {
		t.Fatalf("ListAttemptsByRecipes: %v", err)
	}
	if len(result[r1]) != 1 {
		t.Errorf("expected 1 attempt for cake, got %d", len(result[r1]))
	}
	if len(result[r2]) != 1 {
		t.Errorf("expected 1 attempt for soup, got %d", len(result[r2]))
	}
}

func TestListAttemptsByRecipes_EmptyInput(t *testing.T) {
	db := testutil.NewTestDB(t)

	result, err := ListAttemptsByRecipes(db, []int64{})
	if err != nil {
		t.Fatalf("ListAttemptsByRecipes(empty): %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty map, got %d entries", len(result))
	}
}

func TestDeleteRecipe_CascadesAttempts(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")
	id := mustCreateRecipe(t, db, userID, "Cake", "cake", true)
	_, _ = AddAttempt(db, &Attempt{RecipeID: id, UserID: userID, Title: "Attempt"})

	_ = DeleteRecipe(db, id)

	// Attempts table should be empty for this recipe after cascade delete.
	attempts, err := ListAttemptsByRecipe(db, id)
	if err != nil {
		t.Fatalf("ListAttemptsByRecipe after delete: %v", err)
	}
	if len(attempts) != 0 {
		t.Errorf("expected 0 attempts after recipe delete, got %d", len(attempts))
	}
}

func TestSearchRecipesByUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	mustCreateRecipe(t, db, userID, "Chocolate Cake", "chocolate-cake", true)
	mustCreateRecipe(t, db, userID, "Lemon Tart", "lemon-tart", true)
	mustCreateRecipe(t, db, userID, "Chocolate Draft", "chocolate-draft", false)

	results, err := SearchRecipesByUser(db, userID, "Chocolate")
	if err != nil {
		t.Fatalf("SearchRecipesByUser: %v", err)
	}
	// Only published recipes should appear.
	if len(results) != 1 {
		t.Errorf("expected 1 result, got %d", len(results))
	}
	if results[0].Title != "Chocolate Cake" {
		t.Errorf("unexpected: %q", results[0].Title)
	}
}

func TestRecipe_StructuredFields_RoundTrip(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := mustCreateUser(t, db, "alice")

	r := &Recipe{
		UserID:    userID,
		Title:     "Bread",
		Slug:      "bread",
		Published: true,
		IngredientsGroups: []IngredientGroup{
			{Title: "Dough", Items: []string{"flour", "water", "yeast"}},
		},
		MethodGroups: []MethodGroup{
			{Title: "Mixing", Steps: []MethodStep{{Text: "Combine"}, {Text: "Knead"}}},
		},
		Variations: []Variation{
			{Title: "Sourdough", Notes: "Replace yeast with starter"},
		},
	}

	id, err := CreateRecipe(db, r)
	if err != nil {
		t.Fatalf("CreateRecipe: %v", err)
	}

	loaded, err := GetRecipeByID(db, id)
	if err != nil {
		t.Fatalf("GetRecipeByID: %v", err)
	}

	if len(loaded.IngredientsGroups) != 1 {
		t.Errorf("IngredientsGroups: expected 1 group, got %d", len(loaded.IngredientsGroups))
	}
	if len(loaded.MethodGroups) != 1 {
		t.Errorf("MethodGroups: expected 1 group, got %d", len(loaded.MethodGroups))
	}
	if len(loaded.Variations) != 1 {
		t.Errorf("Variations: expected 1, got %d", len(loaded.Variations))
	}
	if loaded.Variations[0].Title != "Sourdough" {
		t.Errorf("Variation title: got %q", loaded.Variations[0].Title)
	}
}
