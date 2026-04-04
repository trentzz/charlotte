package db

import (
	"database/sql"
	"fmt"
)

// migrations is the ordered list of SQL statements that bring the schema up to date.
// Each entry is applied exactly once, tracked by position in the schema_migrations table.
var migrations = []string{
	// 0: schema_migrations tracking table
	`CREATE TABLE IF NOT EXISTS schema_migrations (
		version    INTEGER PRIMARY KEY,
		applied_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	// 1: site settings
	`CREATE TABLE IF NOT EXISTS site_settings (
		key   TEXT PRIMARY KEY NOT NULL,
		value TEXT NOT NULL DEFAULT ''
	)`,

	// 2: seed site settings
	`INSERT OR IGNORE INTO site_settings (key, value) VALUES
		('site_name',         'Charlotte'),
		('registration_open', 'true'),
		('site_description',  'A personal website platform.')`,

	// 3: users
	`CREATE TABLE IF NOT EXISTS users (
		id            INTEGER PRIMARY KEY,
		username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
		email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
		password_hash TEXT    NOT NULL,
		display_name  TEXT    NOT NULL DEFAULT '',
		bio           TEXT    NOT NULL DEFAULT '',
		avatar_path   TEXT    NOT NULL DEFAULT '',
		role          TEXT    NOT NULL DEFAULT 'user'
		                      CHECK(role IN ('user','admin')),
		status        TEXT    NOT NULL DEFAULT 'pending'
		                      CHECK(status IN ('pending','active','suspended')),
		feature_blog    INTEGER NOT NULL DEFAULT 0 CHECK(feature_blog    IN (0,1)),
		feature_about   INTEGER NOT NULL DEFAULT 0 CHECK(feature_about   IN (0,1)),
		feature_gallery INTEGER NOT NULL DEFAULT 0 CHECK(feature_gallery IN (0,1)),
		feature_recipes INTEGER NOT NULL DEFAULT 0 CHECK(feature_recipes IN (0,1)),
		links         TEXT    NOT NULL DEFAULT '[]',
		created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	// 4: user indexes
	`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
	`CREATE INDEX IF NOT EXISTS idx_users_status   ON users(status)`,

	// 5: sessions
	`CREATE TABLE IF NOT EXISTS sessions (
		token      TEXT    PRIMARY KEY NOT NULL,
		user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		expires_at INTEGER NOT NULL
	)`,

	`CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,

	// 6: blog posts
	`CREATE TABLE IF NOT EXISTS blog_posts (
		id         INTEGER PRIMARY KEY,
		user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		title      TEXT    NOT NULL,
		slug       TEXT    NOT NULL,
		body       TEXT    NOT NULL DEFAULT '',
		published  INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
		UNIQUE(user_id, slug)
	)`,

	`CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id)`,

	// 7: blog tags
	`CREATE TABLE IF NOT EXISTS blog_tags (
		id   INTEGER PRIMARY KEY,
		name TEXT NOT NULL UNIQUE COLLATE NOCASE
	)`,

	`CREATE TABLE IF NOT EXISTS blog_post_tags (
		post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
		tag_id  INTEGER NOT NULL REFERENCES blog_tags(id)  ON DELETE CASCADE,
		PRIMARY KEY (post_id, tag_id)
	)`,

	// 8: about pages
	`CREATE TABLE IF NOT EXISTS about_pages (
		id         INTEGER PRIMARY KEY,
		user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
		content    TEXT    NOT NULL DEFAULT '',
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	// 9: gallery albums
	`CREATE TABLE IF NOT EXISTS gallery_albums (
		id          INTEGER PRIMARY KEY,
		user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		title       TEXT    NOT NULL,
		slug        TEXT    NOT NULL,
		description TEXT    NOT NULL DEFAULT '',
		cover_photo INTEGER,
		created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
		UNIQUE(user_id, slug)
	)`,

	`CREATE INDEX IF NOT EXISTS idx_gallery_albums_user_id ON gallery_albums(user_id)`,

	// 10: photos
	`CREATE TABLE IF NOT EXISTS photos (
		id          INTEGER PRIMARY KEY,
		user_id     INTEGER NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
		album_id    INTEGER NOT NULL REFERENCES gallery_albums(id)  ON DELETE CASCADE,
		filename    TEXT    NOT NULL,
		caption     TEXT    NOT NULL DEFAULT '',
		mime_type   TEXT    NOT NULL,
		size_bytes  INTEGER NOT NULL DEFAULT 0,
		width       INTEGER NOT NULL DEFAULT 0,
		height      INTEGER NOT NULL DEFAULT 0,
		created_at  INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	`CREATE INDEX IF NOT EXISTS idx_photos_user_id  ON photos(user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id)`,

	// 11: recipes
	`CREATE TABLE IF NOT EXISTS recipes (
		id           INTEGER PRIMARY KEY,
		user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		title        TEXT    NOT NULL,
		slug         TEXT    NOT NULL,
		description  TEXT    NOT NULL DEFAULT '',
		ingredients  TEXT    NOT NULL DEFAULT '',
		steps        TEXT    NOT NULL DEFAULT '',
		published    INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
		created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
		UNIQUE(user_id, slug)
	)`,

	`CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id)`,

	// 12: recipe attempts (cooking journal entries)
	`CREATE TABLE IF NOT EXISTS recipe_attempts (
		id         INTEGER PRIMARY KEY,
		recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
		title      TEXT    NOT NULL,
		notes      TEXT    NOT NULL DEFAULT '',
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	`CREATE INDEX IF NOT EXISTS idx_recipe_attempts_recipe_id ON recipe_attempts(recipe_id)`,

	// 13: add published flag to gallery_albums (default 1 = public)
	`ALTER TABLE gallery_albums ADD COLUMN published INTEGER NOT NULL DEFAULT 1`,

	// 14: per-user theme settings
	`ALTER TABLE users ADD COLUMN theme_json TEXT NOT NULL DEFAULT '{}'`,

	// 15: feature flag for projects
	`ALTER TABLE users ADD COLUMN feature_projects INTEGER NOT NULL DEFAULT 0 CHECK(feature_projects IN (0,1))`,

	// 16: projects table
	`CREATE TABLE IF NOT EXISTS projects (
		id            INTEGER PRIMARY KEY,
		user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		title         TEXT    NOT NULL,
		description   TEXT    NOT NULL DEFAULT '',
		url           TEXT    NOT NULL DEFAULT '',
		image_path    TEXT    NOT NULL DEFAULT '',
		display_order INTEGER NOT NULL DEFAULT 0,
		published     INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
		created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`,

	// 17: homepage grid layout for each user
	`ALTER TABLE users ADD COLUMN homepage_json TEXT NOT NULL DEFAULT '{}'`,

	// 18: structured recipe columns (ingredients groups, method groups, variations)
	`ALTER TABLE recipes ADD COLUMN ingredients_json TEXT NOT NULL DEFAULT '[]'`,
	`ALTER TABLE recipes ADD COLUMN method_json TEXT NOT NULL DEFAULT '[]'`,
	`ALTER TABLE recipes ADD COLUMN variations_json TEXT NOT NULL DEFAULT '[]'`,

	// 19: recipe photos
	`CREATE TABLE IF NOT EXISTS recipe_photos (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
		path       TEXT    NOT NULL,
		caption    TEXT    NOT NULL DEFAULT '',
		sort_order INTEGER NOT NULL DEFAULT 0,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	)`,

	`CREATE INDEX IF NOT EXISTS idx_recipe_photos_recipe_id ON recipe_photos(recipe_id)`,
}

// migrate runs any migrations that have not yet been applied, in order.
func migrate(db *sql.DB) error {
	// Ensure the tracking table exists first (it is migration index 0).
	if _, err := db.Exec(migrations[0]); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for i, stmt := range migrations {
		// Check whether this version has already been applied.
		var count int
		if err := db.QueryRow(
			`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, i,
		).Scan(&count); err != nil {
			return fmt.Errorf("check migration %d: %w", i, err)
		}
		if count > 0 {
			continue
		}

		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("apply migration %d: %w", i, err)
		}

		if _, err := db.Exec(
			`INSERT INTO schema_migrations (version) VALUES (?)`, i,
		); err != nil {
			return fmt.Errorf("record migration %d: %w", i, err)
		}
	}

	return nil
}
