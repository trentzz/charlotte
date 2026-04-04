package models

import (
	"database/sql"
	"encoding/json"
)

// WidgetType identifies the kind of content a homepage widget displays.
type WidgetType string

const (
	WidgetBlogPost WidgetType = "blog_post"
	WidgetPhoto    WidgetType = "photo"
	WidgetAlbum    WidgetType = "album"
	WidgetRecipe   WidgetType = "recipe"
	WidgetProject  WidgetType = "project"
	WidgetText     WidgetType = "text"
	WidgetProfile  WidgetType = "profile"
	WidgetLink     WidgetType = "link"
)

// WidgetLayout holds the grid position and size.
type WidgetLayout struct {
	X int `json:"x"`
	Y int `json:"y"`
	W int `json:"w"`
	H int `json:"h"`
}

// Widget is a single item on the homepage grid.
type Widget struct {
	ID        string       `json:"id"`
	Type      WidgetType   `json:"type"`
	ContentID int64        `json:"content_id,omitempty"` // for blog_post, photo, album, recipe, project
	Content   string       `json:"content,omitempty"`    // for text, link widgets
	Label     string       `json:"label,omitempty"`      // display label override
	URL       string       `json:"url,omitempty"`        // for link widget
	Layout    WidgetLayout `json:"layout"`
}

// HomepageLayout is the full saved layout for a user's homepage.
type HomepageLayout struct {
	Widgets []Widget `json:"widgets"`
}

// GetHomepageLayout reads the homepage_json for a user.
func GetHomepageLayout(db *sql.DB, userID int64) (*HomepageLayout, error) {
	var raw string
	err := db.QueryRow(`SELECT homepage_json FROM users WHERE id = ?`, userID).Scan(&raw)
	if err != nil {
		return nil, err
	}
	var layout HomepageLayout
	if raw == "" || raw == "{}" || raw == "null" {
		return &HomepageLayout{Widgets: []Widget{}}, nil
	}
	if err := json.Unmarshal([]byte(raw), &layout); err != nil {
		return &HomepageLayout{Widgets: []Widget{}}, nil
	}
	if layout.Widgets == nil {
		layout.Widgets = []Widget{}
	}
	return &layout, nil
}

// SaveHomepageLayout writes the homepage_json for a user.
func SaveHomepageLayout(db *sql.DB, userID int64, layout *HomepageLayout) error {
	b, err := json.Marshal(layout)
	if err != nil {
		return err
	}
	_, err = db.Exec(`UPDATE users SET homepage_json = ?, updated_at = unixepoch() WHERE id = ?`, string(b), userID)
	return err
}
