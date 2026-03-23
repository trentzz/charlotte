package handlers

import (
	"database/sql"
	"net/http"
	"regexp"
	"strings"

	"github.com/trentzz/charlotte/internal/auth"
	"github.com/trentzz/charlotte/internal/models"
)

var usernameRE = regexp.MustCompile(`^[a-zA-Z0-9_-]{3,32}$`)

// RegisterPage renders GET /register.
func (a *App) RegisterPage(w http.ResponseWriter, r *http.Request) {
	settings, _ := models.GetSiteSettings(a.DB)
	if settings != nil && !settings.RegistrationOpen {
		http.Error(w, "Registration is currently closed.", http.StatusForbidden)
		return
	}
	pd := a.newPage(r, "Register")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "auth/register", pd)
}

// RegisterSubmit handles POST /register.
func (a *App) RegisterSubmit(w http.ResponseWriter, r *http.Request) {
	settings, _ := models.GetSiteSettings(a.DB)
	if settings != nil && !settings.RegistrationOpen {
		http.Error(w, "Registration is currently closed.", http.StatusForbidden)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	username := strings.TrimSpace(r.FormValue("username"))
	email := strings.TrimSpace(strings.ToLower(r.FormValue("email")))
	password := r.FormValue("password")
	confirm := r.FormValue("confirm_password")

	// Validate inputs.
	var errMsg string
	switch {
	case !usernameRE.MatchString(username):
		errMsg = "Username must be 3–32 characters: letters, digits, hyphens, and underscores only."
	case len(email) < 3 || !strings.Contains(email, "@"):
		errMsg = "Please enter a valid email address."
	case len(password) < 8:
		errMsg = "Password must be at least 8 characters."
	case password != confirm:
		errMsg = "Passwords do not match."
	}

	if errMsg != "" {
		pd := a.newPage(r, "Register")
		pd.Flash = errMsg
		a.Tmpl.Render(w, http.StatusUnprocessableEntity, "auth/register", pd)
		return
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
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
		Username:     username,
		Email:        email,
		PasswordHash: hash,
		Role:         role,
		Status:       status,
	}

	id, err := models.CreateUser(a.DB, u)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			pd := a.newPage(r, "Register")
			pd.Flash = "That username or email is already taken."
			a.Tmpl.Render(w, http.StatusConflict, "auth/register", pd)
			return
		}
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	u.ID = id

	if u.IsActive() {
		if _, err := auth.NewSession(a.DB, w, id); err != nil {
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}
		http.Redirect(w, r, "/dashboard/", http.StatusSeeOther)
		return
	}

	// Pending user: show the login page with an informational message.
	http.Redirect(w, r, "/login?flash=Registration+successful.+Your+account+is+awaiting+approval.", http.StatusSeeOther)
}

// LoginPage renders GET /login.
func (a *App) LoginPage(w http.ResponseWriter, r *http.Request) {
	pd := a.newPage(r, "Log in")
	pd.Flash = flashFromRequest(r)
	a.Tmpl.Render(w, http.StatusOK, "auth/login", pd)
}

// LoginSubmit handles POST /login.
func (a *App) LoginSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	identifier := strings.TrimSpace(r.FormValue("identifier")) // username or email
	password := r.FormValue("password")
	next := r.FormValue("next")
	if next == "" {
		next = "/dashboard/"
	}

	var (
		user *models.User
		err  error
	)
	if strings.Contains(identifier, "@") {
		user, err = models.GetUserByEmail(a.DB, identifier)
	} else {
		user, err = models.GetUserByUsername(a.DB, identifier)
	}

	fail := func(msg string) {
		pd := a.newPage(r, "Log in")
		pd.Flash = msg
		a.Tmpl.Render(w, http.StatusUnauthorized, "auth/login", pd)
	}

	if err == sql.ErrNoRows || user == nil {
		fail("Invalid username or password.")
		return
	}
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	if auth.CheckPassword(password, user.PasswordHash) != nil {
		fail("Invalid username or password.")
		return
	}
	if user.Status == models.StatusPending {
		fail("Your account is awaiting admin approval.")
		return
	}
	if user.Status == models.StatusSuspended {
		fail("Your account has been suspended.")
		return
	}

	if _, err := auth.NewSession(a.DB, w, user.ID); err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, next, http.StatusSeeOther)
}

// Logout handles POST /logout.
func (a *App) Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(a.DB, w, r)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
