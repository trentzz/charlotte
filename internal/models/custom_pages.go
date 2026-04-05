package models

import (
	"database/sql"
	"time"
)

// CustomPage represents a user-created custom page.
type CustomPage struct {
	ID          int64
	UserID      int64
	Kind        string
	Format      string
	Slug        string
	Title       string
	Description string
	Body        string
	DataJSON    string
	Published   bool
	NavPinned   bool
	SortOrder   int
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

const customPageSelect = `SELECT id, user_id, kind, format, slug, title, description, body, data_json, published, nav_pinned, sort_order, created_at, updated_at FROM custom_pages`

func scanCustomPage(row interface{ Scan(...any) error }) (*CustomPage, error) {
	p := &CustomPage{}
	var pub, navPinned int
	var cat, uat int64
	err := row.Scan(
		&p.ID, &p.UserID, &p.Kind, &p.Format, &p.Slug,
		&p.Title, &p.Description, &p.Body, &p.DataJSON,
		&pub, &navPinned, &p.SortOrder, &cat, &uat,
	)
	if err != nil {
		return nil, err
	}
	p.Published = pub == 1
	p.NavPinned = navPinned == 1
	p.CreatedAt = time.Unix(cat, 0)
	p.UpdatedAt = time.Unix(uat, 0)
	return p, nil
}

// ListCustomPagesByUser returns all custom pages for a user. Pass publishedOnly=true for public views.
func ListCustomPagesByUser(db *sql.DB, userID int64, publishedOnly bool) ([]*CustomPage, error) {
	q := customPageSelect + ` WHERE user_id = ?`
	args := []any{userID}
	if publishedOnly {
		q += ` AND published = 1`
	}
	q += ` ORDER BY sort_order ASC, id ASC`
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var pages []*CustomPage
	for rows.Next() {
		p, err := scanCustomPage(rows)
		if err != nil {
			continue
		}
		pages = append(pages, p)
	}
	return pages, rows.Err()
}

// GetCustomPageByID returns a custom page by primary key.
func GetCustomPageByID(db *sql.DB, id int64) (*CustomPage, error) {
	row := db.QueryRow(customPageSelect+` WHERE id = ?`, id)
	return scanCustomPage(row)
}

// GetCustomPageBySlug returns a custom page for a user by slug.
func GetCustomPageBySlug(db *sql.DB, userID int64, slug string) (*CustomPage, error) {
	row := db.QueryRow(customPageSelect+` WHERE user_id = ? AND slug = ?`, userID, slug)
	return scanCustomPage(row)
}

// CreateCustomPage inserts a new custom page and returns its ID.
func CreateCustomPage(db *sql.DB, p *CustomPage) (int64, error) {
	res, err := db.Exec(`
		INSERT INTO custom_pages (user_id, kind, format, slug, title, description, body, data_json, published, nav_pinned, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, p.UserID, p.Kind, p.Format, p.Slug, p.Title, p.Description, p.Body, p.DataJSON, boolToInt(p.Published), boolToInt(p.NavPinned), p.SortOrder)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateCustomPage saves changes to an existing custom page.
func UpdateCustomPage(db *sql.DB, p *CustomPage) error {
	_, err := db.Exec(`
		UPDATE custom_pages SET kind=?, format=?, slug=?, title=?, description=?, body=?, data_json=?, published=?, nav_pinned=?, sort_order=?, updated_at=unixepoch()
		WHERE id=? AND user_id=?
	`, p.Kind, p.Format, p.Slug, p.Title, p.Description, p.Body, p.DataJSON, boolToInt(p.Published), boolToInt(p.NavPinned), p.SortOrder, p.ID, p.UserID)
	return err
}

// ToggleCustomPagePublished flips the published flag for a page owned by userID.
func ToggleCustomPagePublished(db *sql.DB, id int64, userID int64) error {
	_, err := db.Exec(
		`UPDATE custom_pages SET published = 1-published, updated_at=unixepoch() WHERE id=? AND user_id=?`,
		id, userID,
	)
	return err
}

// DeleteCustomPage removes a custom page and all its entries (via cascade).
func DeleteCustomPage(db *sql.DB, id int64, userID int64) error {
	_, err := db.Exec(`DELETE FROM custom_pages WHERE id=? AND user_id=?`, id, userID)
	return err
}
