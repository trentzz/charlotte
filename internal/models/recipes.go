package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// IngredientGroup is a named section of ingredients (title may be empty).
type IngredientGroup struct {
	Title string   `json:"title"`
	Items []string `json:"items"`
}

// MethodStep is a single method step, optionally with a countdown timer duration.
// It serialises as {"text": "...", "timer_seconds": 0} in JSON.
// For backwards compatibility it also unmarshals from a plain JSON string.
type MethodStep struct {
	Text         string `json:"text"`
	TimerSeconds int    `json:"timer_seconds,omitempty"`
}

// UnmarshalJSON lets MethodStep accept either a plain string or an object.
func (s *MethodStep) UnmarshalJSON(b []byte) error {
	// Try object form first.
	type plain struct {
		Text         string `json:"text"`
		TimerSeconds int    `json:"timer_seconds"`
	}
	var obj plain
	if err := json.Unmarshal(b, &obj); err == nil && obj.Text != "" {
		s.Text = obj.Text
		s.TimerSeconds = obj.TimerSeconds
		return nil
	}
	// Fall back to plain string.
	var str string
	if err := json.Unmarshal(b, &str); err != nil {
		return err
	}
	s.Text = str
	return nil
}

// MethodGroup is a named section of method steps (title may be empty).
// TimerSeconds is an optional countdown timer duration for the whole section.
type MethodGroup struct {
	Title        string       `json:"title"`
	TimerSeconds int          `json:"timer_seconds,omitempty"`
	Steps        []MethodStep `json:"steps"`
}

// Variation is a named recipe variation with substitution notes.
// FromIngredient and FromStep are 1-based references into the global ingredient
// and method step sequences; 0 means not set.
type Variation struct {
	Title          string `json:"title"`
	Notes          string `json:"notes"`
	FromIngredient int    `json:"from_ingredient,omitempty"`
	FromStep       int    `json:"from_step,omitempty"`
}

// Recipe is a single recipe entry.
type Recipe struct {
	ID          int64
	UserID      int64
	Title       string
	Slug        string
	Description string
	Ingredients string // legacy newline-delimited, kept for backwards compat
	Steps       string // legacy newline-delimited, kept for backwards compat
	// Structured fields (stored as JSON in the DB).
	IngredientsGroups []IngredientGroup
	MethodGroups      []MethodGroup
	Variations        []Variation
	Published         bool
	Attempts          []*Attempt
	Photos            []*RecipePhoto
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// Attempt is a cooking journal entry attached to a recipe.
type Attempt struct {
	ID        int64
	RecipeID  int64
	UserID    int64
	Title     string
	Notes     string
	CreatedAt time.Time
}

func scanRecipe(row interface{ Scan(...any) error }) (*Recipe, error) {
	var r Recipe
	var published int
	var createdAt, updatedAt int64
	var ingredientsJSON, methodJSON, variationsJSON string
	err := row.Scan(
		&r.ID, &r.UserID, &r.Title, &r.Slug, &r.Description,
		&r.Ingredients, &r.Steps, &published, &createdAt, &updatedAt,
		&ingredientsJSON, &methodJSON, &variationsJSON,
	)
	if err != nil {
		return nil, err
	}
	r.Published = published == 1
	r.CreatedAt = time.Unix(createdAt, 0)
	r.UpdatedAt = time.Unix(updatedAt, 0)

	// Parse structured JSON columns; fall back to empty slices on error.
	if err := json.Unmarshal([]byte(ingredientsJSON), &r.IngredientsGroups); err != nil {
		r.IngredientsGroups = []IngredientGroup{}
	}
	if err := json.Unmarshal([]byte(methodJSON), &r.MethodGroups); err != nil {
		r.MethodGroups = []MethodGroup{}
	}
	if err := json.Unmarshal([]byte(variationsJSON), &r.Variations); err != nil {
		r.Variations = []Variation{}
	}
	return &r, nil
}

const recipeSelect = `SELECT id, user_id, title, slug, description,
	ingredients, steps, published, created_at, updated_at,
	ingredients_json, method_json, variations_json FROM recipes`

// marshalRecipeJSON serialises the structured fields for DB storage.
func marshalRecipeJSON(r *Recipe) (ingJSON, methJSON, varJSON string, err error) {
	if r.IngredientsGroups == nil {
		r.IngredientsGroups = []IngredientGroup{}
	}
	if r.MethodGroups == nil {
		r.MethodGroups = []MethodGroup{}
	}
	if r.Variations == nil {
		r.Variations = []Variation{}
	}

	ib, err := json.Marshal(r.IngredientsGroups)
	if err != nil {
		return "", "", "", fmt.Errorf("marshal ingredients_json: %w", err)
	}
	mb, err := json.Marshal(r.MethodGroups)
	if err != nil {
		return "", "", "", fmt.Errorf("marshal method_json: %w", err)
	}
	vb, err := json.Marshal(r.Variations)
	if err != nil {
		return "", "", "", fmt.Errorf("marshal variations_json: %w", err)
	}
	return string(ib), string(mb), string(vb), nil
}

// CreateRecipe inserts a new recipe.
func CreateRecipe(db *sql.DB, r *Recipe) (int64, error) {
	ingJSON, methJSON, varJSON, err := marshalRecipeJSON(r)
	if err != nil {
		return 0, err
	}
	res, err := db.Exec(
		`INSERT INTO recipes
		 (user_id, title, slug, description, ingredients, steps, published,
		  ingredients_json, method_json, variations_json)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		r.UserID, r.Title, r.Slug, r.Description,
		r.Ingredients, r.Steps, boolToInt(r.Published),
		ingJSON, methJSON, varJSON,
	)
	if err != nil {
		return 0, fmt.Errorf("create recipe: %w", err)
	}
	return res.LastInsertId()
}

// GetRecipeBySlug returns a recipe with all its attempts and photos.
func GetRecipeBySlug(db *sql.DB, userID int64, slug string) (*Recipe, error) {
	r, err := scanRecipe(db.QueryRow(
		recipeSelect+` WHERE user_id = ? AND slug = ?`, userID, slug,
	))
	if err != nil {
		return nil, err
	}
	r.Attempts, err = ListAttemptsByRecipe(db, r.ID)
	if err != nil {
		return r, err
	}
	r.Photos, _ = ListRecipePhotos(db, r.ID)
	return r, nil
}

// GetRecipeByID returns a recipe by primary key, with its attempts and photos.
func GetRecipeByID(db *sql.DB, id int64) (*Recipe, error) {
	r, err := scanRecipe(db.QueryRow(recipeSelect+` WHERE id = ?`, id))
	if err != nil {
		return nil, err
	}
	r.Attempts, err = ListAttemptsByRecipe(db, r.ID)
	if err != nil {
		return r, err
	}
	r.Photos, _ = ListRecipePhotos(db, r.ID)
	return r, nil
}

// ListRecipesByUser returns recipes for a user. Pass publishedOnly for the public view.
// Attempts are loaded for each recipe so attempt counts are available.
func ListRecipesByUser(db *sql.DB, userID int64, publishedOnly bool) ([]*Recipe, error) {
	q := recipeSelect + ` WHERE user_id = ?`
	if publishedOnly {
		q += ` AND published = 1`
	}
	q += ` ORDER BY updated_at DESC`

	rows, err := db.Query(q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipes []*Recipe
	for rows.Next() {
		r, err := scanRecipe(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		recipes = append(recipes, r)
	}
	rows.Close() // must close before making more DB calls
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load attempts for all recipes in a single batch query.
	ids := make([]int64, len(recipes))
	for i, r := range recipes {
		ids[i] = r.ID
	}
	attemptsByRecipe, err := ListAttemptsByRecipes(db, ids)
	if err == nil {
		for _, r := range recipes {
			r.Attempts = attemptsByRecipe[r.ID]
		}
	}
	return recipes, nil
}

// SearchRecipesByUser returns published recipes matching q in title or description.
func SearchRecipesByUser(db *sql.DB, userID int64, q string) ([]*Recipe, error) {
	like := "%" + q + "%"
	rows, err := db.Query(`
		SELECT id, user_id, title, slug, description,
		       ingredients, steps, published, created_at, updated_at,
		       ingredients_json, method_json, variations_json
		FROM recipes
		WHERE user_id = ? AND published = 1 AND (title LIKE ? OR description LIKE ?)
		ORDER BY updated_at DESC LIMIT 10`,
		userID, like, like,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var recipes []*Recipe
	for rows.Next() {
		r, err := scanRecipe(rows)
		if err != nil {
			continue
		}
		recipes = append(recipes, r)
	}
	return recipes, rows.Err()
}

// UpdateRecipe saves edits to an existing recipe.
func UpdateRecipe(db *sql.DB, r *Recipe) error {
	ingJSON, methJSON, varJSON, err := marshalRecipeJSON(r)
	if err != nil {
		return err
	}
	_, err = db.Exec(
		`UPDATE recipes SET title=?, slug=?, description=?, ingredients=?, steps=?,
		 published=?, updated_at=unixepoch(),
		 ingredients_json=?, method_json=?, variations_json=?
		 WHERE id=? AND user_id=?`,
		r.Title, r.Slug, r.Description, r.Ingredients, r.Steps,
		boolToInt(r.Published),
		ingJSON, methJSON, varJSON,
		r.ID, r.UserID,
	)
	return err
}

// SetRecipePublished sets the published flag for a recipe.
func SetRecipePublished(db *sql.DB, recipeID int64, published bool) error {
	v := 0
	if published {
		v = 1
	}
	_, err := db.Exec(
		`UPDATE recipes SET published = ?, updated_at = unixepoch() WHERE id = ?`,
		v, recipeID,
	)
	return err
}

// DeleteRecipe removes a recipe and all its attempts.
func DeleteRecipe(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM recipes WHERE id = ?`, id)
	return err
}

// AddAttempt appends a new cooking journal entry to a recipe.
func AddAttempt(db *sql.DB, a *Attempt) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO recipe_attempts (recipe_id, user_id, title, notes) VALUES (?, ?, ?, ?)`,
		a.RecipeID, a.UserID, a.Title, a.Notes,
	)
	if err != nil {
		return 0, fmt.Errorf("add attempt: %w", err)
	}
	return res.LastInsertId()
}

// DeleteAttempt removes a single attempt. recipeID is required so the delete
// only succeeds when the attempt actually belongs to that recipe, preventing
// IDOR attacks where a user could delete attempts from other recipes.
func DeleteAttempt(db *sql.DB, id, recipeID int64) error {
	_, err := db.Exec(`DELETE FROM recipe_attempts WHERE id = ? AND recipe_id = ?`, id, recipeID)
	return err
}

// ListAttemptsByRecipe returns attempts for a recipe in reverse chronological order.
func ListAttemptsByRecipe(db *sql.DB, recipeID int64) ([]*Attempt, error) {
	rows, err := db.Query(
		`SELECT id, recipe_id, user_id, title, notes, created_at
		 FROM recipe_attempts WHERE recipe_id = ? ORDER BY created_at DESC`,
		recipeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attempts []*Attempt
	for rows.Next() {
		var a Attempt
		var createdAt int64
		if err := rows.Scan(&a.ID, &a.RecipeID, &a.UserID, &a.Title, &a.Notes, &createdAt); err != nil {
			return nil, err
		}
		a.CreatedAt = time.Unix(createdAt, 0)
		attempts = append(attempts, &a)
	}
	return attempts, rows.Err()
}

// ListAttemptsByRecipes loads attempts for a slice of recipe IDs in one query,
// returning a map of recipeID to attempts. Returns an empty map for an empty input.
func ListAttemptsByRecipes(db *sql.DB, recipeIDs []int64) (map[int64][]*Attempt, error) {
	if len(recipeIDs) == 0 {
		return map[int64][]*Attempt{}, nil
	}
	placeholders := make([]string, len(recipeIDs))
	args := make([]any, len(recipeIDs))
	for i, id := range recipeIDs {
		placeholders[i] = "?"
		args[i] = id
	}
	q := "SELECT id, recipe_id, user_id, title, notes, created_at FROM recipe_attempts WHERE recipe_id IN (" +
		strings.Join(placeholders, ",") + ") ORDER BY created_at ASC"
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64][]*Attempt)
	for rows.Next() {
		var a Attempt
		var createdAt int64
		if err := rows.Scan(&a.ID, &a.RecipeID, &a.UserID, &a.Title, &a.Notes, &createdAt); err != nil {
			return nil, err
		}
		a.CreatedAt = time.Unix(createdAt, 0)
		result[a.RecipeID] = append(result[a.RecipeID], &a)
	}
	return result, rows.Err()
}

// ListAllRecipes returns all recipes for admin use.
func ListAllRecipes(db *sql.DB) ([]*Recipe, error) {
	rows, err := db.Query(recipeSelect + ` ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var recipes []*Recipe
	for rows.Next() {
		r, err := scanRecipe(rows)
		if err != nil {
			return nil, err
		}
		recipes = append(recipes, r)
	}
	return recipes, rows.Err()
}
