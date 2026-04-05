package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/trentzz/charlotte/internal/models"
)

const (
	// SessionCookieName is the name of the session cookie.
	SessionCookieName = "charlotte_session"
	// SessionDuration is how long a session remains valid.
	SessionDuration = 30 * 24 * time.Hour
)

// GenerateToken returns a cryptographically random 32-byte base64url-encoded token.
func GenerateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// NewSession creates a session record for userID and sets the session cookie on w.
func NewSession(db *sql.DB, w http.ResponseWriter, userID int64) (*models.Session, error) {
	token, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	s := &models.Session{
		Token:     token,
		UserID:    userID,
		ExpiresAt: time.Now().Add(SessionDuration),
	}
	if err := models.CreateSession(db, s); err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	SetSessionCookie(w, token, s.ExpiresAt)
	return s, nil
}

// SetSessionCookie writes the session cookie to the response.
func SetSessionCookie(w http.ResponseWriter, token string, expires time.Time) {
	secure := os.Getenv("CHARLOTTE_SECURE_COOKIES") == "true"
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Expires:  expires,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   secure,
	})
}

// ClearSession deletes the session from the DB and clears the cookie.
func ClearSession(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie(SessionCookieName)
	if err == nil {
		_ = models.DeleteSession(db, c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:    SessionCookieName,
		Value:   "",
		Path:    "/",
		Expires: time.Unix(0, 0),
		MaxAge:  -1,
	})
}

// SessionFromRequest reads the session token from the request cookie, looks up
// the session in the DB, and returns the associated user. Returns (nil, nil, nil)
// if no valid session is present.
func SessionFromRequest(db *sql.DB, r *http.Request) (*models.Session, *models.User, error) {
	c, err := r.Cookie(SessionCookieName)
	if err != nil {
		return nil, nil, nil // no cookie — not an error
	}

	sess, err := models.GetSession(db, c.Value)
	if err == sql.ErrNoRows {
		return nil, nil, nil // expired or invalid
	}
	if err != nil {
		return nil, nil, fmt.Errorf("get session: %w", err)
	}

	user, err := models.GetUserByID(db, sess.UserID)
	if err == sql.ErrNoRows {
		return nil, nil, nil // user deleted
	}
	if err != nil {
		return nil, nil, fmt.Errorf("get user: %w", err)
	}

	return sess, user, nil
}
