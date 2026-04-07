package models

import (
	"database/sql"
	"fmt"
	"time"
)

// Project is a portfolio item with a title, description, optional URL, cover image,
// long-form body, and links to related blog posts.
type Project struct {
	ID           int64
	UserID       int64
	Title        string
	Slug         string
	Description  string
	URL          string
	ImagePath    string
	Body         string
	DisplayOrder int
	Published    bool
	ThemeJSON    string
	ThemeEnabled bool
	Theme        UserTheme
	CreatedAt    time.Time
	UpdatedAt    time.Time

	// Hydrated fields — not stored directly in the projects table.
	LinkedPosts []*Post
}

func scanProject(row interface{ Scan(...any) error }) (*Project, error) {
	var p Project
	var published, themeEnabled int
	var createdAt, updatedAt int64
	var themeJSON string
	err := row.Scan(
		&p.ID, &p.UserID, &p.Title, &p.Slug, &p.Description, &p.URL,
		&p.ImagePath, &p.Body, &p.DisplayOrder, &published, &createdAt, &updatedAt,
		&themeJSON, &themeEnabled,
	)
	if err != nil {
		return nil, err
	}
	p.Published = published == 1
	p.ThemeEnabled = themeEnabled == 1
	p.Theme = UnmarshalTheme(themeJSON)
	p.CreatedAt = time.Unix(createdAt, 0)
	p.UpdatedAt = time.Unix(updatedAt, 0)
	return &p, nil
}

const projectSelect = `SELECT id, user_id, title, slug, description, url, image_path, body, display_order, published, created_at, updated_at, theme_json, theme_enabled FROM projects`

// CreateProject inserts a new project and returns its ID.
func CreateProject(db *sql.DB, p *Project) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO projects (user_id, title, slug, description, url, image_path, body, display_order, published)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.UserID, p.Title, p.Slug, p.Description, p.URL, p.ImagePath, p.Body, p.DisplayOrder, boolToInt(p.Published),
	)
	if err != nil {
		return 0, fmt.Errorf("create project: %w", err)
	}
	return res.LastInsertId()
}

// GetProjectByID returns a project by its primary key, including linked posts.
func GetProjectByID(db *sql.DB, id int64) (*Project, error) {
	row := db.QueryRow(projectSelect+` WHERE id = ?`, id)
	p, err := scanProject(row)
	if err != nil {
		return nil, err
	}
	p.LinkedPosts, err = ListLinkedPosts(db, p.ID)
	return p, err
}

// GetProjectBySlug returns a project by user ID and slug, including linked posts.
func GetProjectBySlug(db *sql.DB, userID int64, slug string) (*Project, error) {
	row := db.QueryRow(projectSelect+` WHERE user_id = ? AND slug = ?`, userID, slug)
	p, err := scanProject(row)
	if err != nil {
		return nil, err
	}
	p.LinkedPosts, err = ListLinkedPosts(db, p.ID)
	return p, err
}

// ListProjectsByUser returns all projects for a user. Pass publishedOnly=true for public views.
// Linked posts are not hydrated on list queries — call GetProjectByID for the full record.
func ListProjectsByUser(db *sql.DB, userID int64, publishedOnly bool) ([]*Project, error) {
	q := projectSelect + ` WHERE user_id = ?`
	if publishedOnly {
		q += ` AND published = 1`
	}
	q += ` ORDER BY display_order ASC, created_at DESC`
	rows, err := db.Query(q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []*Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

// UpdateProject saves changes to an existing project.
func UpdateProject(db *sql.DB, p *Project) error {
	_, err := db.Exec(
		`UPDATE projects SET title=?, slug=?, description=?, url=?, image_path=?, body=?,
		 display_order=?, published=?, updated_at=unixepoch() WHERE id=? AND user_id=?`,
		p.Title, p.Slug, p.Description, p.URL, p.ImagePath, p.Body,
		p.DisplayOrder, boolToInt(p.Published), p.ID, p.UserID,
	)
	return err
}

// SetProjectPublished toggles the published flag.
func SetProjectPublished(db *sql.DB, id int64, published bool) error {
	_, err := db.Exec(`UPDATE projects SET published=?, updated_at=unixepoch() WHERE id=?`,
		boolToInt(published), id)
	return err
}

// DeleteProject removes a project by ID and returns the deleted record.
func DeleteProject(db *sql.DB, id int64) (*Project, error) {
	p, err := GetProjectByID(db, id)
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`DELETE FROM projects WHERE id=?`, id)
	return p, err
}

// SearchProjectsByUser returns published projects matching q in title, description, or body.
func SearchProjectsByUser(db *sql.DB, userID int64, q string) ([]*Project, error) {
	like := "%" + q + "%"
	rows, err := db.Query(
		projectSelect+` WHERE user_id = ? AND published = 1 AND (title LIKE ? OR description LIKE ? OR body LIKE ?) ORDER BY display_order ASC LIMIT 10`,
		userID, like, like, like,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []*Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			continue
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

// ListLinkedPosts returns the blog posts linked to a project, ordered by creation date.
func ListLinkedPosts(db *sql.DB, projectID int64) ([]*Post, error) {
	const q = `SELECT id, user_id, title, slug, body, published, created_at, updated_at, theme_json, theme_enabled
	           FROM blog_posts
	           WHERE id IN (SELECT post_id FROM project_post_links WHERE project_id = ?)
	           ORDER BY created_at DESC`
	rows, err := db.Query(q, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var posts []*Post
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

// SetLinkedPosts replaces the linked posts for a project.
// Only posts belonging to the given userID may be linked.
func SetLinkedPosts(db *sql.DB, projectID, userID int64, postIDs []int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.Exec(`DELETE FROM project_post_links WHERE project_id = ?`, projectID); err != nil {
		return err
	}
	for _, pid := range postIDs {
		// Confirm the post belongs to this user before linking.
		var ownerID int64
		if err := tx.QueryRow(`SELECT user_id FROM blog_posts WHERE id = ?`, pid).Scan(&ownerID); err != nil {
			continue // skip missing or unowned posts
		}
		if ownerID != userID {
			continue
		}
		if _, err := tx.Exec(
			`INSERT OR IGNORE INTO project_post_links (project_id, post_id) VALUES (?, ?)`,
			projectID, pid,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}
