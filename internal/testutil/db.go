// Package testutil provides helpers for writing tests against a real SQLite database.
package testutil

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"

	"github.com/trentzz/charlotte/internal/db"
)

// NewTestDB opens an in-memory SQLite database, runs all migrations, and registers
// a cleanup function that closes it when the test finishes. Tests must import
// _ "modernc.org/sqlite" (this package does it for them).
func NewTestDB(t *testing.T) *sql.DB {
	t.Helper()

	conn, err := sql.Open("sqlite", ":memory:?_pragma=foreign_keys(ON)")
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}

	if err := db.Migrate(conn); err != nil {
		t.Fatalf("migrate test db: %v", err)
	}

	t.Cleanup(func() { conn.Close() })
	return conn
}
