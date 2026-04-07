package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

var contentThemeTables = map[string]bool{
	"gallery_albums": true,
	"blog_posts":     true,
	"recipes":        true,
	"projects":       true,
	"custom_pages":   true,
}

// UpdateContentTheme saves a page-level theme override.
func UpdateContentTheme(db *sql.DB, table string, id int64, theme UserTheme, enabled bool) error {
	if !contentThemeTables[table] {
		return fmt.Errorf("invalid table: %s", table)
	}
	b, err := json.Marshal(theme)
	if err != nil {
		return err
	}
	_, err = db.Exec(
		`UPDATE `+table+` SET theme_json = ?, theme_enabled = ?, updated_at = unixepoch() WHERE id = ?`,
		string(b), boolToInt(enabled), id,
	)
	return err
}

// UnmarshalTheme parses a theme_json string into a UserTheme, falling back to DefaultTheme() for missing fields.
func UnmarshalTheme(s string) UserTheme {
	t := DefaultTheme()
	if s != "" && s != "{}" {
		_ = json.Unmarshal([]byte(s), &t)
	}
	return t
}
