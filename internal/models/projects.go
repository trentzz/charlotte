package models

import (
	"database/sql"
	"fmt"
	"time"
)

// Project is a portfolio item with a title, description, URL, and optional image.
type Project struct {
	ID           int64
	UserID       int64
	Title        string
	Description  string
	URL          string
	ImagePath    string
	DisplayOrder int
	Published    bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func scanProject(row interface{ Scan(...any) error }) (*Project, error) {
	var p Project
	var published int
	var createdAt, updatedAt int64
	err := row.Scan(
		&p.ID, &p.UserID, &p.Title, &p.Description, &p.URL,
		&p.ImagePath, &p.DisplayOrder, &published, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.Published = published == 1
	p.CreatedAt = time.Unix(createdAt, 0)
	p.UpdatedAt = time.Unix(updatedAt, 0)
	return &p, nil
}

const projectSelect = `SELECT id, user_id, title, description, url, image_path, display_order, published, created_at, updated_at FROM projects`

// CreateProject inserts a new project and returns its ID.
func CreateProject(db *sql.DB, p *Project) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO projects (user_id, title, description, url, image_path, display_order, published)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		p.UserID, p.Title, p.Description, p.URL, p.ImagePath, p.DisplayOrder, boolToInt(p.Published),
	)
	if err != nil {
		return 0, fmt.Errorf("create project: %w", err)
	}
	return res.LastInsertId()
}

// GetProjectByID returns a project by its primary key.
func GetProjectByID(db *sql.DB, id int64) (*Project, error) {
	row := db.QueryRow(projectSelect+` WHERE id = ?`, id)
	return scanProject(row)
}

// ListProjectsByUser returns all projects for a user. Pass publishedOnly=true for public views.
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
		`UPDATE projects SET title=?, description=?, url=?, image_path=?, display_order=?,
		 published=?, updated_at=unixepoch() WHERE id=? AND user_id=?`,
		p.Title, p.Description, p.URL, p.ImagePath, p.DisplayOrder,
		boolToInt(p.Published), p.ID, p.UserID,
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
