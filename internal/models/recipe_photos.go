package models

import (
	"database/sql"
	"fmt"
	"time"
)

// RecipePhoto is a photo attached to a recipe.
type RecipePhoto struct {
	ID        int64
	RecipeID  int64
	UserID    int64
	Path      string
	Caption   string
	SortOrder int
	CreatedAt time.Time
}

// ListRecipePhotos returns all photos for a recipe ordered by sort_order, then id.
func ListRecipePhotos(db *sql.DB, recipeID int64) ([]*RecipePhoto, error) {
	rows, err := db.Query(`
		SELECT id, recipe_id, user_id, path, caption, sort_order, created_at
		FROM recipe_photos
		WHERE recipe_id = ?
		ORDER BY sort_order ASC, id ASC
	`, recipeID)
	if err != nil {
		return nil, fmt.Errorf("list recipe photos: %w", err)
	}
	defer rows.Close()

	var photos []*RecipePhoto
	for rows.Next() {
		p := &RecipePhoto{}
		var ts int64
		if err := rows.Scan(&p.ID, &p.RecipeID, &p.UserID, &p.Path, &p.Caption, &p.SortOrder, &ts); err != nil {
			return nil, fmt.Errorf("scan recipe photo: %w", err)
		}
		p.CreatedAt = time.Unix(ts, 0).UTC()
		photos = append(photos, p)
	}
	return photos, rows.Err()
}

// AddRecipePhoto inserts a new recipe photo and returns its ID.
func AddRecipePhoto(db *sql.DB, photo *RecipePhoto) (int64, error) {
	res, err := db.Exec(`
		INSERT INTO recipe_photos (recipe_id, user_id, path, caption, sort_order)
		VALUES (?, ?, ?, ?, ?)
	`, photo.RecipeID, photo.UserID, photo.Path, photo.Caption, photo.SortOrder)
	if err != nil {
		return 0, fmt.Errorf("add recipe photo: %w", err)
	}
	return res.LastInsertId()
}

// DeleteRecipePhoto deletes a photo by ID and verifies ownership via user_id.
// Returns an error if the photo does not exist or belongs to a different user.
func DeleteRecipePhoto(db *sql.DB, photoID, userID int64) error {
	res, err := db.Exec(`
		DELETE FROM recipe_photos WHERE id = ? AND user_id = ?
	`, photoID, userID)
	if err != nil {
		return fmt.Errorf("delete recipe photo: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete recipe photo: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("recipe photo not found or not owned by user")
	}
	return nil
}

// GetRecipePhoto returns a single recipe photo by ID.
func GetRecipePhoto(db *sql.DB, photoID int64) (*RecipePhoto, error) {
	p := &RecipePhoto{}
	var ts int64
	err := db.QueryRow(`
		SELECT id, recipe_id, user_id, path, caption, sort_order, created_at
		FROM recipe_photos WHERE id = ?
	`, photoID).Scan(&p.ID, &p.RecipeID, &p.UserID, &p.Path, &p.Caption, &p.SortOrder, &ts)
	if err != nil {
		return nil, fmt.Errorf("get recipe photo: %w", err)
	}
	p.CreatedAt = time.Unix(ts, 0).UTC()
	return p, nil
}

// UpdateRecipePhotoCaption updates the caption on a photo, verifying ownership.
func UpdateRecipePhotoCaption(db *sql.DB, photoID, userID int64, caption string) error {
	res, err := db.Exec(`
		UPDATE recipe_photos SET caption = ? WHERE id = ? AND user_id = ?
	`, caption, photoID, userID)
	if err != nil {
		return fmt.Errorf("update recipe photo caption: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("update recipe photo caption: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("recipe photo not found or not owned by user")
	}
	return nil
}
