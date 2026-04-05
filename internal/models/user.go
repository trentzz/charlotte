// Package models provides data types and database query functions.
package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// Role represents a user's permission level.
type Role string

// Status represents a user account's activation state.
type Status string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

const (
	StatusPending   Status = "pending"
	StatusActive    Status = "active"
	StatusSuspended Status = "suspended"
)

// UserLink is a labelled URL stored on a user profile.
type UserLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

// UserTheme holds the visual configuration for a user's public pages.
type UserTheme struct {
	AccentH      int    `json:"accent_h"`      // hue 0-360, default 150 (sage green)
	AccentS      int    `json:"accent_s"`      // saturation 0-100, default 20
	AccentL      int    `json:"accent_l"`      // lightness 0-100, default 63
	BgH          int    `json:"bg_h"`          // background hue, default 35
	BgS          int    `json:"bg_s"`          // background saturation, default 60
	BgL          int    `json:"bg_l"`          // background lightness, default 97
	DarkAccentH  int    `json:"dark_accent_h"` // dark mode accent hue, default 150
	DarkAccentS  int    `json:"dark_accent_s"` // dark mode accent saturation, default 30
	DarkAccentL  int    `json:"dark_accent_l"` // dark mode accent lightness, default 55
	DarkBgH      int    `json:"dark_bg_h"`     // dark mode background hue, default 220
	DarkBgS      int    `json:"dark_bg_s"`     // dark mode background saturation, default 15
	DarkBgL      int    `json:"dark_bg_l"`     // dark mode background lightness, default 12
	TextH        int    `json:"text_h"`        // body text hue, default 220
	TextS        int    `json:"text_s"`        // body text saturation, default 15
	TextL        int    `json:"text_l"`        // body text lightness, default 20
	HeadingH     int    `json:"heading_h"`     // heading text hue, default 220
	HeadingS     int    `json:"heading_s"`     // heading text saturation, default 20
	HeadingL     int    `json:"heading_l"`     // heading text lightness, default 10
	DarkTextH    int    `json:"dark_text_h"`   // dark mode body text hue, default 220
	DarkTextS    int    `json:"dark_text_s"`   // dark mode body text saturation, default 15
	DarkTextL    int    `json:"dark_text_l"`   // dark mode body text lightness, default 85
	DarkHeadingH int    `json:"dark_heading_h"` // dark mode heading text hue, default 220
	DarkHeadingS int    `json:"dark_heading_s"` // dark mode heading text saturation, default 10
	DarkHeadingL int    `json:"dark_heading_l"` // dark mode heading text lightness, default 92
	FontBody     string `json:"font_body"`      // body font, default "Playfair Display"
	FontDisplay  string `json:"font_display"`   // heading font, default "Playfair Display"
	FontUI       string `json:"font_ui"`        // UI/interface font (menus, buttons, labels), default "Inter"
	FontSize     int    `json:"font_size"`      // base font size px, default 16
	NavFontSize  int    `json:"nav_font_size"`  // nav label size px, default 13
}

// DefaultTheme returns the default visual theme matching the site's built-in palette.
func DefaultTheme() UserTheme {
	return UserTheme{
		AccentH:      150,
		AccentS:      20,
		AccentL:      63,
		BgH:          35,
		BgS:          60,
		BgL:          97,
		DarkAccentH:  150,
		DarkAccentS:  30,
		DarkAccentL:  55,
		DarkBgH:      220,
		DarkBgS:      15,
		DarkBgL:      12,
		TextH:        220,
		TextS:        15,
		TextL:        20,
		HeadingH:     220,
		HeadingS:     20,
		HeadingL:     10,
		DarkTextH:    220,
		DarkTextS:    15,
		DarkTextL:    85,
		DarkHeadingH: 220,
		DarkHeadingS: 10,
		DarkHeadingL: 92,
		FontBody:     "Playfair Display",
		FontDisplay:  "Playfair Display",
		FontUI:       "Inter",
		FontSize:     16,
		NavFontSize:  13,
	}
}

// User represents a registered account.
type User struct {
	ID              int64
	Username        string
	Email           string
	PasswordHash    string
	DisplayName     string
	Bio             string
	AvatarPath      string
	Role            Role
	Status          Status
	FeatureBlog     bool
	FeatureAbout    bool
	FeatureGallery  bool
	FeatureRecipes  bool
	FeatureProjects bool
	ShowOnHomepage  bool
	Theme           UserTheme
	Links           []UserLink
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// DisplayOrUsername returns DisplayName if set, otherwise Username.
func (u *User) DisplayOrUsername() string {
	if u.DisplayName != "" {
		return u.DisplayName
	}
	return u.Username
}

// IsAdmin returns true when the user holds the admin role.
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// IsActive returns true when the account is active.
func (u *User) IsActive() bool {
	return u.Status == StatusActive
}

// scanUser scans a single row into a User. The SELECT must return columns in
// the order defined by userColumns.
func scanUser(row interface {
	Scan(...any) error
}) (*User, error) {
	var u User
	var linksJSON string
	var themeJSON string
	var featureProjects int
	var showOnHomepage int
	var createdAt, updatedAt int64

	err := row.Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash,
		&u.DisplayName, &u.Bio, &u.AvatarPath,
		&u.Role, &u.Status,
		&u.FeatureBlog, &u.FeatureAbout, &u.FeatureGallery, &u.FeatureRecipes,
		&linksJSON, &createdAt, &updatedAt,
		&featureProjects, &themeJSON, &showOnHomepage,
	)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(linksJSON), &u.Links); err != nil {
		u.Links = nil
	}
	u.FeatureProjects = featureProjects == 1
	u.ShowOnHomepage = showOnHomepage == 1
	theme := DefaultTheme()
	if themeJSON != "" && themeJSON != "{}" {
		_ = json.Unmarshal([]byte(themeJSON), &theme)
	}
	u.Theme = theme
	u.CreatedAt = time.Unix(createdAt, 0)
	u.UpdatedAt = time.Unix(updatedAt, 0)
	return &u, nil
}

const userSelect = `SELECT id, username, email, password_hash,
	display_name, bio, avatar_path, role, status,
	feature_blog, feature_about, feature_gallery, feature_recipes,
	links, created_at, updated_at,
	feature_projects, theme_json, show_on_homepage FROM users`

// CreateUser inserts a new user and returns the assigned ID.
func CreateUser(db *sql.DB, u *User) (int64, error) {
	linksJSON, err := json.Marshal(u.Links)
	if err != nil {
		linksJSON = []byte("[]")
	}

	res, err := db.Exec(`INSERT INTO users
		(username, email, password_hash, display_name, bio, avatar_path, role, status, links)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		u.Username, u.Email, u.PasswordHash,
		u.DisplayName, u.Bio, u.AvatarPath,
		u.Role, u.Status, string(linksJSON),
	)
	if err != nil {
		return 0, fmt.Errorf("create user: %w", err)
	}
	return res.LastInsertId()
}

// GetUserByID returns the user with the given ID, or sql.ErrNoRows.
func GetUserByID(db *sql.DB, id int64) (*User, error) {
	row := db.QueryRow(userSelect+` WHERE id = ?`, id)
	return scanUser(row)
}

// GetUserByUsername returns the user with the given username (case-insensitive).
func GetUserByUsername(db *sql.DB, username string) (*User, error) {
	row := db.QueryRow(userSelect+` WHERE username = ?`, username)
	return scanUser(row)
}

// GetUserByEmail returns the user with the given email (case-insensitive).
func GetUserByEmail(db *sql.DB, email string) (*User, error) {
	row := db.QueryRow(userSelect+` WHERE email = ?`, email)
	return scanUser(row)
}

// ListActiveUsers returns all users with status = active, ordered by username.
func ListActiveUsers(db *sql.DB) ([]*User, error) {
	rows, err := db.Query(userSelect+` WHERE status = 'active' ORDER BY username`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUsers(rows)
}

// ListVisibleUsers returns active users who have opted in to appear on the
// landing page (show_on_homepage = 1), ordered by username.
func ListVisibleUsers(db *sql.DB) ([]*User, error) {
	rows, err := db.Query(userSelect+` WHERE status = 'active' AND show_on_homepage = 1 ORDER BY username`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUsers(rows)
}

// ListAllUsers returns every user ordered by created_at desc. Used by the admin panel.
func ListAllUsers(db *sql.DB) ([]*User, error) {
	rows, err := db.Query(userSelect + ` ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUsers(rows)
}

func scanUsers(rows *sql.Rows) ([]*User, error) {
	var users []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpdateUser saves profile fields (display_name, bio, avatar_path, links,
// show_on_homepage, updated_at).
func UpdateUser(db *sql.DB, u *User) error {
	linksJSON, err := json.Marshal(u.Links)
	if err != nil {
		linksJSON = []byte("[]")
	}
	_, err = db.Exec(`UPDATE users SET
		display_name = ?, bio = ?, avatar_path = ?, links = ?,
		show_on_homepage = ?,
		updated_at = unixepoch()
		WHERE id = ?`,
		u.DisplayName, u.Bio, u.AvatarPath, string(linksJSON),
		boolToInt(u.ShowOnHomepage), u.ID,
	)
	return err
}

// UpdateUserTheme saves the theme JSON for a user.
func UpdateUserTheme(db *sql.DB, userID int64, theme UserTheme) error {
	b, err := json.Marshal(theme)
	if err != nil {
		return err
	}
	_, err = db.Exec(`UPDATE users SET theme_json = ?, updated_at = unixepoch() WHERE id = ?`,
		string(b), userID)
	return err
}

// UpdateUserFeatures toggles the feature flags for a user.
func UpdateUserFeatures(db *sql.DB, id int64, blog, about, gallery, recipes, projects bool) error {
	_, err := db.Exec(`UPDATE users SET
		feature_blog = ?, feature_about = ?, feature_gallery = ?, feature_recipes = ?,
		feature_projects = ?,
		updated_at = unixepoch()
		WHERE id = ?`,
		boolToInt(blog), boolToInt(about), boolToInt(gallery), boolToInt(recipes),
		boolToInt(projects), id,
	)
	return err
}

// UpdateUserStatus changes a user's status.
func UpdateUserStatus(db *sql.DB, id int64, status Status) error {
	_, err := db.Exec(`UPDATE users SET status = ?, updated_at = unixepoch() WHERE id = ?`,
		status, id)
	return err
}

// UpdateUserRole promotes or demotes a user.
func UpdateUserRole(db *sql.DB, id int64, role Role) error {
	_, err := db.Exec(`UPDATE users SET role = ?, updated_at = unixepoch() WHERE id = ?`,
		role, id)
	return err
}

// DeleteUser permanently removes a user and all cascade-deleted content.
func DeleteUser(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM users WHERE id = ?`, id)
	return err
}

// GetFirstAdminUser returns the first active admin user, ordered by ID.
// Returns sql.ErrNoRows if no admin exists.
func GetFirstAdminUser(db *sql.DB) (*User, error) {
	row := db.QueryRow(userSelect + ` WHERE role = 'admin' AND status = 'active' ORDER BY id ASC LIMIT 1`)
	return scanUser(row)
}

// CountUsers returns the total number of users in the database.
func CountUsers(db *sql.DB) (int, error) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
	return count, err
}

// GetDiskUsageByUser returns the total size_bytes of photos per user ID.
func GetDiskUsageByUser(db *sql.DB) (map[int64]int64, error) {
	rows, err := db.Query(`SELECT user_id, COALESCE(SUM(size_bytes),0) FROM photos GROUP BY user_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	usage := make(map[int64]int64)
	for rows.Next() {
		var uid, sz int64
		if err := rows.Scan(&uid, &sz); err != nil {
			return nil, err
		}
		usage[uid] = sz
	}
	return usage, rows.Err()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
