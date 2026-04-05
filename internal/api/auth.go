package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/trentzz/charlotte/internal/auth"
	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// emailRE validates a non-blank email address.
// Requires at least one non-whitespace char before @, a domain, and a TLD of two or more chars.
var emailRE = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]{2,}$`)

var usernameRE = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,32}$`)

// Register handles POST /api/v1/auth/register.
func (a *App) Register(w http.ResponseWriter, r *http.Request) {
	settings, _ := models.GetSiteSettings(a.DB)
	if settings != nil && !settings.RegistrationOpen {
		a.respondError(w, http.StatusForbidden, "registration is currently closed")
		return
	}

	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	username := strings.TrimSpace(body.Username)
	email := strings.TrimSpace(strings.ToLower(body.Email))
	password := body.Password

	switch {
	case !usernameRE.MatchString(username):
		a.respondError(w, http.StatusUnprocessableEntity, "username must be 3-32 characters: letters, digits, hyphens, and underscores only")
		return
	case email != "" && !emailRE.MatchString(email):
		a.respondError(w, http.StatusUnprocessableEntity, "invalid email address")
		return
	case len(password) < 8:
		a.respondError(w, http.StatusUnprocessableEntity, "password must be at least 8 characters")
		return
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		a.internalError(w, r, err)
		return
	}

	// First registered user becomes admin; subsequent users are pending.
	count, _ := models.CountUsers(a.DB)
	role := models.RoleUser
	status := models.StatusPending
	if count == 0 {
		role = models.RoleAdmin
		status = models.StatusActive
	}

	u := &models.User{
		Username:        username,
		Email:           email,
		PasswordHash:    hash,
		Role:            role,
		Status:          status,
		FeatureBlog:     true,
		FeatureAbout:    true,
		FeatureGallery:  true,
		FeatureRecipes:  true,
		FeatureProjects: true,
	}

	id, err := models.CreateUser(a.DB, u)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			a.respondError(w, http.StatusConflict, "that username or email is already taken")
			return
		}
		a.internalError(w, r, err)
		return
	}
	u.ID = id

	if u.IsActive() {
		if _, err := auth.NewSession(a.DB, w, id); err != nil {
			a.internalError(w, r, err)
			return
		}
		// Re-fetch to get all fields populated.
		full, err := models.GetUserByID(a.DB, id)
		if err != nil {
			a.internalError(w, r, err)
			return
		}
		a.respondJSON(w, http.StatusCreated, toUserJSONWithEmail(full))
		return
	}

	a.respondJSON(w, http.StatusCreated, map[string]string{
		"message": "registration successful — your account is awaiting approval",
	})
}

// Login handles POST /api/v1/auth/login.
func (a *App) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Identifier string `json:"identifier"` // username or email
		Password   string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	identifier := strings.TrimSpace(body.Identifier)

	var (
		user *models.User
		err  error
	)
	if strings.Contains(identifier, "@") {
		user, err = models.GetUserByEmail(a.DB, identifier)
	} else {
		user, err = models.GetUserByUsername(a.DB, identifier)
	}

	if err == sql.ErrNoRows || user == nil {
		a.respondError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	if auth.CheckPassword(body.Password, user.PasswordHash) != nil {
		a.respondError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if user.Status == models.StatusPending {
		a.respondError(w, http.StatusForbidden, "your account is awaiting admin approval")
		return
	}
	if user.Status == models.StatusSuspended {
		a.respondError(w, http.StatusForbidden, "your account has been suspended")
		return
	}

	if _, err := auth.NewSession(a.DB, w, user.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	// Bind a fresh CSRF token to the new session so previous session tokens cannot be reused.
	middleware.SetCSRFCookie(w)
	a.respondJSON(w, http.StatusOK, toUserJSONWithEmail(user))
}

// Logout handles POST /api/v1/auth/logout.
func (a *App) Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(a.DB, w, r)
	middleware.ClearCSRFCookie(w)
	a.respondJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// Me handles GET /api/v1/auth/me — returns the current user from session.
func (a *App) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		a.respondError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	a.respondJSON(w, http.StatusOK, toUserJSONWithEmail(user))
}

// CSRFToken handles GET /api/v1/auth/csrf — returns the CSRF token as JSON.
func (a *App) CSRFToken(w http.ResponseWriter, r *http.Request) {
	token := middleware.CSRFToken(r)
	a.respondJSON(w, http.StatusOK, map[string]string{"token": token})
}
