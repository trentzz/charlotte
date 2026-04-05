package models

import (
	"database/sql"
	"time"
)

// CustomPageEntry is a single row in a list-format custom page.
type CustomPageEntry struct {
	ID         int64
	PageID     int64
	UserID     int64
	Title      string
	Subtitle   string
	Rating     int
	Status     string
	EntryDate  *time.Time
	FieldsJSON string
	SortOrder  int
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

const entrySelect = `SELECT id, page_id, user_id, title, subtitle, rating, status, entry_date, fields_json, sort_order, created_at, updated_at FROM custom_page_entries`

func scanEntry(row interface{ Scan(...any) error }) (*CustomPageEntry, error) {
	e := &CustomPageEntry{}
	var entryDate *int64
	var cat, uat int64
	err := row.Scan(
		&e.ID, &e.PageID, &e.UserID, &e.Title, &e.Subtitle,
		&e.Rating, &e.Status, &entryDate, &e.FieldsJSON,
		&e.SortOrder, &cat, &uat,
	)
	if err != nil {
		return nil, err
	}
	if entryDate != nil {
		t := time.Unix(*entryDate, 0)
		e.EntryDate = &t
	}
	e.CreatedAt = time.Unix(cat, 0)
	e.UpdatedAt = time.Unix(uat, 0)
	return e, nil
}

// ListEntriesByPage returns all entries for a page, ordered by sort_order then id.
func ListEntriesByPage(db *sql.DB, pageID int64) ([]*CustomPageEntry, error) {
	rows, err := db.Query(entrySelect+` WHERE page_id=? ORDER BY sort_order ASC, id ASC`, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []*CustomPageEntry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			continue
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// GetEntryByID returns a single entry by primary key.
func GetEntryByID(db *sql.DB, id int64) (*CustomPageEntry, error) {
	row := db.QueryRow(entrySelect+` WHERE id=?`, id)
	return scanEntry(row)
}

// CreateEntry inserts a new entry and returns its ID.
func CreateEntry(db *sql.DB, e *CustomPageEntry) (int64, error) {
	var entryDateVal *int64
	if e.EntryDate != nil {
		v := e.EntryDate.Unix()
		entryDateVal = &v
	}
	res, err := db.Exec(`
		INSERT INTO custom_page_entries (page_id, user_id, title, subtitle, rating, status, entry_date, fields_json, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, e.PageID, e.UserID, e.Title, e.Subtitle, e.Rating, e.Status, entryDateVal, e.FieldsJSON, e.SortOrder)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// UpdateEntry saves changes to an existing entry.
func UpdateEntry(db *sql.DB, e *CustomPageEntry) error {
	var entryDateVal *int64
	if e.EntryDate != nil {
		v := e.EntryDate.Unix()
		entryDateVal = &v
	}
	_, err := db.Exec(`
		UPDATE custom_page_entries SET title=?, subtitle=?, rating=?, status=?, entry_date=?, fields_json=?, sort_order=?, updated_at=unixepoch()
		WHERE id=? AND user_id=?
	`, e.Title, e.Subtitle, e.Rating, e.Status, entryDateVal, e.FieldsJSON, e.SortOrder, e.ID, e.UserID)
	return err
}

// DeleteEntry removes an entry owned by userID.
func DeleteEntry(db *sql.DB, id int64, userID int64) error {
	_, err := db.Exec(`DELETE FROM custom_page_entries WHERE id=? AND user_id=?`, id, userID)
	return err
}
