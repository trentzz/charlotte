package models

import (
	"database/sql"
	"time"
)

// Session represents an authenticated user session.
type Session struct {
	Token     string
	UserID    int64
	CreatedAt time.Time
	ExpiresAt time.Time
}

// CreateSession inserts a new session record.
func CreateSession(db *sql.DB, s *Session) error {
	_, err := db.Exec(
		`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`,
		s.Token, s.UserID, s.ExpiresAt.Unix(),
	)
	return err
}

// GetSession retrieves a session by token. Returns sql.ErrNoRows if not found
// or if the session has expired.
func GetSession(db *sql.DB, token string) (*Session, error) {
	var s Session
	var createdAt, expiresAt int64
	err := db.QueryRow(
		`SELECT token, user_id, created_at, expires_at FROM sessions
		 WHERE token = ? AND expires_at > unixepoch()`,
		token,
	).Scan(&s.Token, &s.UserID, &createdAt, &expiresAt)
	if err != nil {
		return nil, err
	}
	s.CreatedAt = time.Unix(createdAt, 0)
	s.ExpiresAt = time.Unix(expiresAt, 0)
	return &s, nil
}

// DeleteSession removes a session (logout).
func DeleteSession(db *sql.DB, token string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE token = ?`, token)
	return err
}

// DeleteExpiredSessions removes all sessions whose expires_at is in the past.
// This should be called periodically (e.g. hourly) to keep the table small.
func DeleteExpiredSessions(db *sql.DB) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE expires_at <= unixepoch()`)
	return err
}
