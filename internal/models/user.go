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

// User represents a registered account.
type User struct {
	ID             int64
	Username       string
	Email          string
	PasswordHash   string
	DisplayName    string
	Bio            string
	AvatarPath     string
	Role           Role
	Status         Status
	FeatureBlog    bool
	FeatureAbout   bool
	FeatureGallery bool
	FeatureRecipes bool
	Links          []UserLink
	CreatedAt      time.Time
	UpdatedAt      time.Time
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
	var createdAt, updatedAt int64

	err := row.Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash,
		&u.DisplayName, &u.Bio, &u.AvatarPath,
		&u.Role, &u.Status,
		&u.FeatureBlog, &u.FeatureAbout, &u.FeatureGallery, &u.FeatureRecipes,
		&linksJSON, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(linksJSON), &u.Links); err != nil {
		u.Links = nil
	}
	u.CreatedAt = time.Unix(createdAt, 0)
	u.UpdatedAt = time.Unix(updatedAt, 0)
	return &u, nil
}

const userSelect = `SELECT id, username, email, password_hash,
	display_name, bio, avatar_path, role, status,
	feature_blog, feature_about, feature_gallery, feature_recipes,
	links, created_at, updated_at FROM users`

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

// UpdateUser saves profile fields (display_name, bio, avatar_path, links, updated_at).
func UpdateUser(db *sql.DB, u *User) error {
	linksJSON, err := json.Marshal(u.Links)
	if err != nil {
		linksJSON = []byte("[]")
	}
	_, err = db.Exec(`UPDATE users SET
		display_name = ?, bio = ?, avatar_path = ?, links = ?,
		updated_at = unixepoch()
		WHERE id = ?`,
		u.DisplayName, u.Bio, u.AvatarPath, string(linksJSON), u.ID,
	)
	return err
}

// UpdateUserFeatures toggles the four feature flags for a user.
func UpdateUserFeatures(db *sql.DB, id int64, blog, about, gallery, recipes bool) error {
	_, err := db.Exec(`UPDATE users SET
		feature_blog = ?, feature_about = ?, feature_gallery = ?, feature_recipes = ?,
		updated_at = unixepoch()
		WHERE id = ?`,
		boolToInt(blog), boolToInt(about), boolToInt(gallery), boolToInt(recipes), id,
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
