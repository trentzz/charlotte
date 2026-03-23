package models

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// Post is a single blog entry.
type Post struct {
	ID        int64
	UserID    int64
	Title     string
	Slug      string
	Body      string
	Published bool
	Tags      []string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func scanPost(row interface{ Scan(...any) error }) (*Post, error) {
	var p Post
	var published int
	var createdAt, updatedAt int64
	err := row.Scan(
		&p.ID, &p.UserID, &p.Title, &p.Slug, &p.Body,
		&published, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.Published = published == 1
	p.CreatedAt = time.Unix(createdAt, 0)
	p.UpdatedAt = time.Unix(updatedAt, 0)
	return &p, nil
}

const postSelect = `SELECT id, user_id, title, slug, body, published, created_at, updated_at FROM blog_posts`

// CreatePost inserts a new blog post and sets p.ID.
func CreatePost(db *sql.DB, p *Post) (int64, error) {
	res, err := db.Exec(
		`INSERT INTO blog_posts (user_id, title, slug, body, published) VALUES (?, ?, ?, ?, ?)`,
		p.UserID, p.Title, p.Slug, p.Body, boolToInt(p.Published),
	)
	if err != nil {
		return 0, fmt.Errorf("create post: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	if len(p.Tags) > 0 {
		if err := UpsertTags(db, id, p.Tags); err != nil {
			return id, err
		}
	}
	return id, nil
}

// GetPostBySlug returns the post with the given slug belonging to userID.
func GetPostBySlug(db *sql.DB, userID int64, slug string) (*Post, error) {
	row := db.QueryRow(postSelect+` WHERE user_id = ? AND slug = ?`, userID, slug)
	p, err := scanPost(row)
	if err != nil {
		return nil, err
	}
	p.Tags, err = GetPostTags(db, p.ID)
	return p, err
}

// GetPostByID returns a post by its primary key.
func GetPostByID(db *sql.DB, id int64) (*Post, error) {
	row := db.QueryRow(postSelect+` WHERE id = ?`, id)
	p, err := scanPost(row)
	if err != nil {
		return nil, err
	}
	p.Tags, err = GetPostTags(db, p.ID)
	return p, err
}

// ListPostsByUser returns posts for userID. Pass publishedOnly=true for the public view.
func ListPostsByUser(db *sql.DB, userID int64, publishedOnly bool) ([]*Post, error) {
	q := postSelect + ` WHERE user_id = ?`
	if publishedOnly {
		q += ` AND published = 1`
	}
	q += ` ORDER BY created_at DESC`

	rows, err := db.Query(q, userID)
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
		p.Tags, _ = GetPostTags(db, p.ID)
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

// UpdatePost saves edits to an existing post.
func UpdatePost(db *sql.DB, p *Post) error {
	_, err := db.Exec(
		`UPDATE blog_posts SET title=?, slug=?, body=?, published=?, updated_at=unixepoch()
		 WHERE id=? AND user_id=?`,
		p.Title, p.Slug, p.Body, boolToInt(p.Published), p.ID, p.UserID,
	)
	if err != nil {
		return err
	}
	return UpsertTags(db, p.ID, p.Tags)
}

// DeletePost removes a post by ID.
// SetPostPublished sets the published flag for a post.
func SetPostPublished(db *sql.DB, postID int64, published bool) error {
	v := 0
	if published {
		v = 1
	}
	_, err := db.Exec(
		`UPDATE blog_posts SET published = ?, updated_at = unixepoch() WHERE id = ?`,
		v, postID,
	)
	return err
}

func DeletePost(db *sql.DB, id int64) error {
	_, err := db.Exec(`DELETE FROM blog_posts WHERE id = ?`, id)
	return err
}

// UpsertTags replaces all tags on a post.
func UpsertTags(db *sql.DB, postID int64, tags []string) error {
	// Remove old associations.
	if _, err := db.Exec(`DELETE FROM blog_post_tags WHERE post_id = ?`, postID); err != nil {
		return err
	}
	for _, name := range tags {
		name = strings.TrimSpace(strings.ToLower(name))
		if name == "" {
			continue
		}
		// Ensure the tag row exists.
		if _, err := db.Exec(
			`INSERT OR IGNORE INTO blog_tags (name) VALUES (?)`, name,
		); err != nil {
			return err
		}
		// Link the tag to the post.
		if _, err := db.Exec(
			`INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id)
			 SELECT ?, id FROM blog_tags WHERE name = ?`, postID, name,
		); err != nil {
			return err
		}
	}
	return nil
}

// GetPostTags returns the tag names for a post.
func GetPostTags(db *sql.DB, postID int64) ([]string, error) {
	rows, err := db.Query(
		`SELECT bt.name FROM blog_tags bt
		 JOIN blog_post_tags bpt ON bpt.tag_id = bt.id
		 WHERE bpt.post_id = ? ORDER BY bt.name`,
		postID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// ListAllPosts returns all posts across all users for admin use.
func ListAllPosts(db *sql.DB) ([]*Post, error) {
	rows, err := db.Query(postSelect + ` ORDER BY created_at DESC`)
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
