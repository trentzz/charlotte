package models

import (
	"database/sql"
	"fmt"
	"time"
)

// Recipe is a single recipe entry.
type Recipe struct {
	ID          int64
	UserID      int64
	Title       string
	Slug        string
	Description string
	Ingredients string // newline-delimited
	Steps       string // newline-delimited
	Published   bool
	Attempts    []*Attempt
	CreatedAt   time.Time
	UpdatedAt   time.Time
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
	err := row.Scan(
		&r.ID, &r.UserID, &r.Title, &r.Slug, &r.Description,
		&r.Ingredients, &r.Steps, &published, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	r.Published = published == 1
	r.CreatedAt = time.Unix(createdAt, 0)
	r.UpdatedAt = time.Unix(updatedAt, 0)
	return &r, nil
}

const recipeSelect = `SELECT id, user_id, title, slug, description,
	ingredients, steps, published, created_at, updated_at FROM recipes`

// CreateRecipe inserts a new recipe.
func CreateRecipe(db *sql.DB, r *Recipe) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO recipes (user_id, title, slug, description, ingredients, steps, published)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		r.UserID, r.Title, r.Slug, r.Description,
		r.Ingredients, r.Steps, boolToInt(r.Published),
	)
	if err != nil {
		return 0, fmt.Errorf("create recipe: %w", err)
	}
	return res.LastInsertId()
}

// GetRecipeBySlug returns a recipe with all its attempts.
func GetRecipeBySlug(db *sql.DB, userID int64, slug string) (*Recipe, error) {
	r, err := scanRecipe(db.QueryRow(
		recipeSelect+` WHERE user_id = ? AND slug = ?`, userID, slug,
	))
	if err != nil {
		return nil, err
	}
	r.Attempts, err = ListAttemptsByRecipe(db, r.ID)
	return r, err
}

// GetRecipeByID returns a recipe by primary key.
func GetRecipeByID(db *sql.DB, id int64) (*Recipe, error) {
	r, err := scanRecipe(db.QueryRow(recipeSelect+` WHERE id = ?`, id))
	if err != nil {
		return nil, err
	}
	r.Attempts, err = ListAttemptsByRecipe(db, r.ID)
	return r, err
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

	// Load attempts for each recipe so counts are available in templates.
	for _, r := range recipes {
		r.Attempts, _ = ListAttemptsByRecipe(db, r.ID)
	}
	return recipes, nil
}

// UpdateRecipe saves edits to an existing recipe.
func UpdateRecipe(db *sql.DB, r *Recipe) error {
	_, err := db.Exec(
		`UPDATE recipes SET title=?, slug=?, description=?, ingredients=?, steps=?,
		 published=?, updated_at=unixepoch() WHERE id=? AND user_id=?`,
		r.Title, r.Slug, r.Description, r.Ingredients, r.Steps,
		boolToInt(r.Published), r.ID, r.UserID,
	)
	return err
}

// DeleteRecipe removes a recipe and all its attempts.
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

// DeleteAttempt removes a single attempt.
func DeleteAttempt(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM recipe_attempts WHERE id = ?`, id)
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
