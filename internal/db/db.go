// Package db handles SQLite database initialisation and connection management.
package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// Open opens (or creates) the SQLite database at DATA_DIR/db/charlotte.db,
// sets appropriate PRAGMAs, and runs all pending migrations.
func Open(dataDir string) (*sql.DB, error) {
	dbDir := filepath.Join(dataDir, "db")
	if err := os.MkdirAll(dbDir, 0o750); err != nil {
		return nil, fmt.Errorf("create db dir: %w", err)
	}

	dsn := filepath.Join(dbDir, "charlotte.db") +
		"?_pragma=foreign_keys(ON)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(5000)" +
		"&_pragma=synchronous(NORMAL)"

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Allow multiple concurrent readers; WAL mode + busy_timeout handle write conflicts.
	// One idle connection is kept warm; extras are released after use.
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	if err := Migrate(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return db, nil
}
