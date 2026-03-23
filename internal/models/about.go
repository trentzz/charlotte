package models

import (
	"database/sql"
	"time"
)

// AboutPage holds the content of a user's about page.
type AboutPage struct {
	ID        int64
	UserID    int64
	Content   string
	UpdatedAt time.Time
}

// GetAboutPage returns a user's about page, or nil (no error) if none exists.
func GetAboutPage(db *sql.DB, userID int64) (*AboutPage, error) {
	var a AboutPage
	var updatedAt int64
	err := db.QueryRow(
		`SELECT id, user_id, content, updated_at FROM about_pages WHERE user_id = ?`, userID,
	).Scan(&a.ID, &a.UserID, &a.Content, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	a.UpdatedAt = time.Unix(updatedAt, 0)
	return &a, nil
}

// UpsertAboutPage creates or replaces the about page content for a user.
func UpsertAboutPage(db *sql.DB, userID int64, content string) error {
	_, err := db.Exec(
		`INSERT INTO about_pages (user_id, content) VALUES (?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET content = excluded.content, updated_at = unixepoch()`,
		userID, content,
	)
	return err
}
